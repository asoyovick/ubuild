package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/ubuild/backend/internal/model"
	"golang.org/x/crypto/scrypt"
)

const sessionCookie = "ubuild_session"

var roles = map[string]bool{"OWNER": true, "COORDINATOR": true, "ARCHITECT": true, "ENGINEER": true, "QUANTITY_SURVEYOR": true, "SITE_SUPERVISOR": true, "CONTRACTOR": true, "SUPPLIER": true}

type API struct {
	DB           *sql.DB
	Origin       string
	CookieSecure bool
	UploadDir    string
	rateMu       sync.Mutex
	rateEntries  map[string]rateEntry
}

type rateEntry struct {
	Count int
	Reset time.Time
}

func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := a.DB.PingContext(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, "Service unavailable.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.Handle("POST /api/auth/register", a.rateLimit(http.HandlerFunc(a.register)))
	mux.Handle("POST /api/auth/login", a.rateLimit(http.HandlerFunc(a.login)))
	mux.HandleFunc("POST /api/auth/logout", a.logout)
	mux.HandleFunc("GET /api/auth/me", a.me)
	mux.HandleFunc("GET /api/dashboard", a.dashboard)
	mux.HandleFunc("GET /api/projects", a.projects)
	mux.HandleFunc("POST /api/projects", a.createProject)
	mux.HandleFunc("GET /api/projects/{projectId}", a.project)
	mux.HandleFunc("GET /api/projects/{projectId}/workspace", a.workspace)
	mux.HandleFunc("GET /api/projects/{projectId}/members", a.members)
	mux.HandleFunc("GET /api/projects/{projectId}/audit", a.audit)
	mux.HandleFunc("POST /api/projects/{projectId}/tasks", a.createTask)
	mux.HandleFunc("PATCH /api/projects/{projectId}/tasks/{taskId}", a.updateTask)
	mux.HandleFunc("POST /api/projects/{projectId}/milestones", a.createMilestone)
	mux.HandleFunc("PATCH /api/projects/{projectId}/milestones/{milestoneId}", a.updateMilestone)
	mux.HandleFunc("POST /api/projects/{projectId}/budget-items", a.createBudgetItem)
	mux.HandleFunc("POST /api/projects/{projectId}/expenses", a.createExpense)
	mux.HandleFunc("PATCH /api/projects/{projectId}/expenses/{expenseId}", a.decideExpense)
	mux.HandleFunc("POST /api/projects/{projectId}/documents", a.uploadDocument)
	mux.HandleFunc("GET /api/projects/{projectId}/documents/{documentId}/download", a.downloadDocument)
	mux.HandleFunc("POST /api/projects/{projectId}/reports", a.createReport)
	mux.HandleFunc("POST /api/projects/{projectId}/approvals", a.createApproval)
	mux.HandleFunc("PATCH /api/projects/{projectId}/approvals/{approvalId}", a.decideApproval)
	mux.HandleFunc("POST /api/projects/{projectId}/quotations", a.createQuotation)
	mux.HandleFunc("PATCH /api/projects/{projectId}/quotations/{quotationId}", a.decideQuotation)
	mux.HandleFunc("POST /api/projects/{projectId}/boq", a.createBOQItem)
	mux.HandleFunc("POST /api/projects/{projectId}/issues", a.createIssue)
	mux.HandleFunc("PATCH /api/projects/{projectId}/issues/{issueId}", a.updateIssue)
	mux.HandleFunc("GET /api/projects/{projectId}/invitations", a.listInvitations)
	mux.HandleFunc("POST /api/projects/{projectId}/invitations", a.createInvitation)
	mux.HandleFunc("DELETE /api/projects/{projectId}/invitations/{token}", a.revokeInvitation)
	mux.HandleFunc("POST /api/invitations/accept", a.acceptInvitation)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", a.Origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Header.Get("Origin") != "" && r.Header.Get("Origin") != a.Origin {
			writeError(w, 403, "Origin not allowed.")
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func (a *API) rateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		key := ip + "|" + r.URL.Path
		now := time.Now()
		a.rateMu.Lock()
		if a.rateEntries == nil {
			a.rateEntries = make(map[string]rateEntry)
		}
		if len(a.rateEntries) > 4096 {
			for oldKey, old := range a.rateEntries {
				if now.After(old.Reset) {
					delete(a.rateEntries, oldKey)
				}
			}
		}
		entry := a.rateEntries[key]
		if now.After(entry.Reset) {
			entry = rateEntry{Reset: now.Add(time.Minute)}
		}
		entry.Count++
		a.rateEntries[key] = entry
		a.rateMu.Unlock()
		if entry.Count > 20 {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "Too many authentication attempts. Try again shortly.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name            string `json:"name"`
		Email           string `json:"email"`
		Role            string `json:"role"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Role = strings.TrimSpace(input.Role)
	errs := map[string]string{}
	if len([]rune(input.Name)) < 2 {
		errs["name"] = "Please enter your full name."
	}
	if !validEmail(input.Email) {
		errs["email"] = "Please enter a valid email address."
	}
	if len(input.Password) < 8 {
		errs["password"] = "Choose a password of at least 8 characters."
	}
	if !roles[input.Role] {
		errs["role"] = "Choose a role from the list."
	}
	if input.ConfirmPassword == "" {
		errs["confirmPassword"] = "Please confirm your password."
	} else if input.Password != input.ConfirmPassword {
		errs["confirmPassword"] = "The passwords do not match."
	}
	if len(errs) > 0 {
		writeJSON(w, 422, map[string]any{"errors": errs})
		return
	}
	var exists int
	if err := a.DB.QueryRow("SELECT 1 FROM users WHERE email=$1", input.Email).Scan(&exists); err == nil {
		writeJSON(w, 409, map[string]any{"errors": map[string]string{"email": "An account with this email already exists. Try logging in."}})
		return
	} else if !errors.Is(err, sql.ErrNoRows) {
		writeError(w, 500, "Unable to create account.")
		return
	}
	hash, err := hashPassword(input.Password)
	if err != nil {
		writeError(w, 500, "Unable to create account.")
		return
	}
	id := newID()
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err = a.DB.Exec("INSERT INTO users(id,name,email,password_hash,profile_role,created_at) VALUES($1,$2,$3,$4,$5,$6)", id, input.Name, input.Email, hash, input.Role, now); err != nil {
		writeError(w, 500, "Unable to create account.")
		return
	}
	user := model.User{ID: id, Name: input.Name, Email: input.Email, ProfileRole: &input.Role}
	if !a.newSession(w, user.ID) {
		writeError(w, 500, "Unable to establish a session.")
		return
	}
	writeJSON(w, 201, map[string]any{"message": "Your account has been created.", "user": user})
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	errs := map[string]string{}
	if !validEmail(input.Email) {
		errs["email"] = "Please enter a valid email address."
	}
	if input.Password == "" {
		errs["password"] = "Please enter your password."
	}
	if len(errs) > 0 {
		writeJSON(w, 422, map[string]any{"errors": errs})
		return
	}
	var id, name, email, hash string
	var role sql.NullString
	err := a.DB.QueryRow("SELECT id,name,email,password_hash,profile_role FROM users WHERE email=$1", input.Email).Scan(&id, &name, &email, &hash, &role)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, 401, map[string]any{"errors": map[string]string{"form": "We couldn't find an account with that email."}})
		return
	}
	if err != nil {
		writeError(w, 500, "Unable to sign in.")
		return
	}
	valid, err := verifyPassword(input.Password, hash)
	if err != nil || !valid {
		writeJSON(w, 401, map[string]any{"errors": map[string]string{"form": "That password doesn't match our records."}})
		return
	}
	var profileRole *string
	if role.Valid {
		profileRole = &role.String
	}
	user := model.User{ID: id, Name: name, Email: email, ProfileRole: profileRole}
	if !a.newSession(w, id) {
		writeError(w, 500, "Unable to establish a session.")
		return
	}
	writeJSON(w, 200, map[string]any{"message": "You are signed in.", "user": user})
}

func (a *API) newSession(w http.ResponseWriter, userID string) bool {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return false
	}
	raw := hex.EncodeToString(token)
	sum := sha256.Sum256([]byte(raw))
	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err := a.DB.Exec("INSERT INTO sessions(token_hash,user_id,created_at) VALUES($1,$2,$3)", hex.EncodeToString(sum[:]), userID, now); err != nil {
		return false
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: raw, Path: "/", HttpOnly: true, Secure: a.CookieSecure, SameSite: http.SameSiteLaxMode, MaxAge: 7 * 24 * 60 * 60})
	return true
}

func (a *API) currentUser(r *http.Request) (model.User, error) {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return model.User{}, err
	}
	sum := sha256.Sum256([]byte(c.Value))
	var u model.User
	var role sql.NullString
	var createdAt string
	err = a.DB.QueryRow(`SELECT u.id,u.name,u.email,u.profile_role,s.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1`, hex.EncodeToString(sum[:])).Scan(&u.ID, &u.Name, &u.Email, &role, &createdAt)
	if err != nil {
		return model.User{}, err
	}
	created, parseErr := time.Parse(time.RFC3339Nano, createdAt)
	if parseErr != nil || time.Since(created) > 7*24*time.Hour || created.After(time.Now().Add(time.Minute)) {
		_, _ = a.DB.Exec("DELETE FROM sessions WHERE token_hash=$1", hex.EncodeToString(sum[:]))
		return model.User{}, sql.ErrNoRows
	}
	if role.Valid {
		u.ProfileRole = &role.String
	}
	return u, err
}
func (a *API) me(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeJSON(w, 401, map[string]any{"user": nil})
		return
	}
	writeJSON(w, 200, map[string]any{"user": u})
}
func (a *API) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		sum := sha256.Sum256([]byte(c.Value))
		_, _ = a.DB.Exec("DELETE FROM sessions WHERE token_hash=$1", hex.EncodeToString(sum[:]))
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", HttpOnly: true, Secure: a.CookieSecure, SameSite: http.SameSiteLaxMode, MaxAge: -1})
	writeJSON(w, 200, map[string]string{"message": "You have been signed out."})
}

func (a *API) projects(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, 401, "Authentication required.")
		return
	}
	rows, err := a.DB.Query(`SELECT p.id,p.owner_id,p.name,p.location,p.type,p.description,p.created_at,p.updated_at,m.id,m.user_id,m.project_id,m.role,m.status,m.joined_at,m.updated_at FROM projects p JOIN memberships m ON m.project_id=p.id WHERE m.user_id=$1 AND m.status='ACTIVE' ORDER BY p.created_at DESC`, u.ID)
	if err != nil {
		writeError(w, 500, "Unable to load projects.")
		return
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var p model.Project
		var m model.Membership
		if err = rows.Scan(&p.ID, &p.OwnerID, &p.Name, &p.Location, &p.Type, &p.Description, &p.CreatedAt, &p.UpdatedAt, &m.ID, &m.UserID, &m.ProjectID, &m.Role, &m.Status, &m.JoinedAt, &m.UpdatedAt); err != nil {
			writeError(w, 500, "Unable to load projects.")
			return
		}
		items = append(items, map[string]any{"project": p, "membership": m})
	}
	writeJSON(w, 200, map[string]any{"projects": items})
}

func (a *API) createProject(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, 401, "Authentication required.")
		return
	}
	var in struct {
		Name        string `json:"name"`
		Location    string `json:"location"`
		Type        string `json:"type"`
		Description string `json:"description"`
	}
	if !decode(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.Location = strings.TrimSpace(in.Location)
	in.Type = strings.TrimSpace(in.Type)
	errs := map[string]string{}
	if len([]rune(in.Name)) < 2 {
		errs["name"] = "Please enter a project name."
	}
	if len([]rune(in.Location)) < 2 {
		errs["location"] = "Please enter a project location."
	}
	if len([]rune(in.Type)) < 2 {
		errs["type"] = "Please enter a project type."
	}
	if len(errs) > 0 {
		writeJSON(w, 422, map[string]any{"errors": errs})
		return
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	id := newID()
	membershipID := newID()
	tx, err := a.DB.Begin()
	if err != nil {
		writeError(w, 500, "Unable to create project.")
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec(`INSERT INTO projects(id,owner_id,name,location,type,description,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, u.ID, in.Name, in.Location, in.Type, strings.TrimSpace(in.Description), now, now)
	if err == nil {
		_, err = tx.Exec(`INSERT INTO memberships(id,user_id,project_id,role,status,joined_at,updated_at) VALUES($1,$2,$3,'OWNER','ACTIVE',$4,$5)`, membershipID, u.ID, id, now, now)
	}
	if err == nil {
		_, err = tx.Exec(`INSERT INTO audit_entries(id,project_id,user_id,action,details,created_at) VALUES($1,$2,$3,'project_created',$4,$5)`, newID(), id, u.ID, fmt.Sprintf("Project created by %s as owner", u.Email), now)
	}
	if err != nil {
		writeError(w, 500, "Unable to create project.")
		return
	}
	if err = tx.Commit(); err != nil {
		writeError(w, 500, "Unable to create project.")
		return
	}
	writeJSON(w, 201, map[string]any{"project": model.Project{ID: id, OwnerID: u.ID, Name: in.Name, Location: in.Location, Type: in.Type, Description: strings.TrimSpace(in.Description), CreatedAt: now, UpdatedAt: now}})
}

func (a *API) project(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, 401, "Authentication required.")
		return
	}
	id := r.PathValue("projectId")
	var p model.Project
	var m model.Membership
	err = a.DB.QueryRow(`SELECT p.id,p.owner_id,p.name,p.location,p.type,p.description,p.created_at,p.updated_at,m.id,m.user_id,m.project_id,m.role,m.status,m.joined_at,m.updated_at FROM projects p JOIN memberships m ON m.project_id=p.id WHERE p.id=$1 AND m.user_id=$2 AND m.status='ACTIVE'`, id, u.ID).Scan(&p.ID, &p.OwnerID, &p.Name, &p.Location, &p.Type, &p.Description, &p.CreatedAt, &p.UpdatedAt, &m.ID, &m.UserID, &m.ProjectID, &m.Role, &m.Status, &m.JoinedAt, &m.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, 404, "Project not found.")
		return
	}
	if err != nil {
		writeError(w, 500, "Unable to load project.")
		return
	}
	writeJSON(w, 200, map[string]any{"project": p, "membership": m})
}

func (a *API) members(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, 401, "Authentication required.")
		return
	}
	id := r.PathValue("projectId")
	var role string
	if err = a.DB.QueryRow(`SELECT role FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, id, u.ID).Scan(&role); errors.Is(err, sql.ErrNoRows) {
		writeError(w, 404, "Project not found.")
		return
	} else if err != nil {
		writeError(w, 500, "Unable to load project members.")
		return
	}
	if !roleCanManageMembers(role) {
		writeError(w, http.StatusForbidden, "You do not have permission to view project members.")
		return
	}
	rows, err := a.DB.Query(`SELECT m.id,m.user_id,m.project_id,m.role,m.status,m.joined_at,m.updated_at,u.name,u.email FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 AND m.status='ACTIVE' ORDER BY m.joined_at`, id)
	if err != nil {
		writeError(w, 500, "Unable to load project members.")
		return
	}
	defer rows.Close()
	type member struct {
		model.Membership
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	result := []member{}
	for rows.Next() {
		var m member
		if err = rows.Scan(&m.ID, &m.UserID, &m.ProjectID, &m.Role, &m.Status, &m.JoinedAt, &m.UpdatedAt, &m.Name, &m.Email); err != nil {
			writeError(w, 500, "Unable to load project members.")
			return
		}
		result = append(result, m)
	}
	writeJSON(w, 200, map[string]any{"members": result})
}

func roleCanManageMembers(role string) bool { return role == "OWNER" || role == "COORDINATOR" }

func (a *API) audit(w http.ResponseWriter, r *http.Request) {
	u, err := a.currentUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required.")
		return
	}
	projectID := r.PathValue("projectId")
	var allowed int
	if err = a.DB.QueryRow(`SELECT 1 FROM memberships WHERE project_id=$1 AND user_id=$2 AND status='ACTIVE'`, projectID, u.ID).Scan(&allowed); errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "Project not found.")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load project activity.")
		return
	}
	rows, err := a.DB.Query(`SELECT id,project_id,user_id,action,details,created_at FROM audit_entries WHERE project_id=$1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load project activity.")
		return
	}
	defer rows.Close()
	type entry struct {
		ID        string `json:"id"`
		ProjectID string `json:"projectId"`
		UserID    string `json:"userId"`
		Action    string `json:"action"`
		Details   string `json:"details"`
		CreatedAt string `json:"createdAt"`
	}
	entries := []entry{}
	for rows.Next() {
		var e entry
		if err = rows.Scan(&e.ID, &e.ProjectID, &e.UserID, &e.Action, &e.Details, &e.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to load project activity.")
			return
		}
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		writeError(w, 400, "The request body could not be read.")
		return false
	}
	if err := d.Decode(new(any)); err != io.EOF {
		writeError(w, 400, "The request body must contain one JSON object.")
		return false
	}
	return true
}
func validEmail(s string) bool {
	if len(s) > 254 {
		return false
	}
	a, e := mail.ParseAddress(s)
	return e == nil && a.Address == s && regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`).MatchString(s)
}
func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, e := rand.Read(salt); e != nil {
		return "", e
	}
	derived, e := scrypt.Key([]byte(password), []byte(hex.EncodeToString(salt)), 16384, 8, 1, 64)
	if e != nil {
		return "", e
	}
	return hex.EncodeToString(salt) + ":" + hex.EncodeToString(derived), nil
}
func verifyPassword(password, encoded string) (bool, error) {
	parts := strings.Split(encoded, ":")
	if len(parts) != 2 {
		return false, nil
	}
	salt, e := hex.DecodeString(parts[0])
	if e != nil {
		return false, nil
	}
	stored, e := hex.DecodeString(parts[1])
	if e != nil || len(stored) != 64 {
		return false, nil
	}
	derived, e := scrypt.Key([]byte(password), []byte(hex.EncodeToString(salt)), 16384, 8, 1, 64)
	if e != nil {
		return false, e
	}
	return subtle.ConstantTimeCompare(derived, stored) == 1, nil
}
func newID() string {
	b := make([]byte, 16)
	if _, e := rand.Read(b); e != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
