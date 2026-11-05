package handler

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/ubuild/backend/internal/repository"
)

func testAPI(t *testing.T) (*sql.DB, http.Handler) {
	t.Helper()
	db, err := repository.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	api := &API{DB: db, Origin: "http://localhost:3000"}
	return db, api.Handler()
}
func call(h http.Handler, method, path string, body any, cookie *http.Cookie) *httptest.ResponseRecorder {
	data, _ := json.Marshal(body)
	req := httptest.NewRequest(method, path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		req.AddCookie(cookie)
	}
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	return res
}
func registerTest(h http.Handler, t *testing.T, email, role string) (*http.Cookie, string) {
	t.Helper()
	res := call(h, "POST", "/api/auth/register", map[string]string{"name": "Test User", "email": email, "role": role, "password": "correct-horse-battery", "confirmPassword": "correct-horse-battery"}, nil)
	if res.Code != 201 {
		t.Fatalf("register: status=%d body=%s", res.Code, res.Body.String())
	}
	var body struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	cookie := res.Result().Cookies()[0]
	return cookie, body.User.ID
}

func TestRegistrationValidationDuplicateAndRole(t *testing.T) {
	db, h := testAPI(t)
	bad := call(h, "POST", "/api/auth/register", map[string]string{"name": "A", "email": "not-an-email", "role": "ADMIN", "password": "short", "confirmPassword": "mismatch"}, nil)
	if bad.Code != 422 {
		t.Fatalf("expected validation status 422, got %d", bad.Code)
	}
	var b map[string]map[string]string
	_ = json.Unmarshal(bad.Body.Bytes(), &b)
	for _, field := range []string{"name", "email", "role", "password", "confirmPassword"} {
		if b["errors"][field] == "" {
			t.Errorf("missing validation error for %s", field)
		}
	}
	_, _ = registerTest(h, t, "User@Example.test", "ARCHITECT")
	var storedHash string
	if err := db.QueryRow(`SELECT password_hash FROM users WHERE email=?`, "user@example.test").Scan(&storedHash); err != nil {
		t.Fatal(err)
	}
	if storedHash == "correct-horse-battery" || storedHash == "" {
		t.Fatal("password was not securely hashed")
	}
	var confirmationColumn int
	if err := db.QueryRow(`SELECT count(*) FROM pragma_table_info('users') WHERE name='confirmPassword'`).Scan(&confirmationColumn); err != nil || confirmationColumn != 0 {
		t.Fatal("password confirmation must not be persisted")
	}
	dupe := call(h, "POST", "/api/auth/register", map[string]string{"name": "Test User", "email": " user@example.test ", "role": "ENGINEER", "password": "correct-horse-battery", "confirmPassword": "correct-horse-battery"}, nil)
	if dupe.Code != 409 {
		t.Fatalf("duplicate status=%d", dupe.Code)
	}
}

func TestLoginAndProfileRole(t *testing.T) {
	_, h := testAPI(t)
	_, _ = registerTest(h, t, "person@example.test", "QUANTITY_SURVEYOR")
	login := call(h, "POST", "/api/auth/login", map[string]string{"email": " PERSON@example.test ", "password": "correct-horse-battery"}, nil)
	if login.Code != 200 {
		t.Fatalf("login status=%d body=%s", login.Code, login.Body.String())
	}
	authCookie := login.Result().Cookies()[0]
	me := call(h, "GET", "/api/auth/me", nil, authCookie)
	if me.Code != 200 {
		t.Fatal(me.Code)
	}
	var body struct {
		User struct {
			Email string  `json:"email"`
			Role  *string `json:"profileRole"`
		} `json:"user"`
	}
	_ = json.Unmarshal(me.Body.Bytes(), &body)
	if body.User.Email != "person@example.test" || body.User.Role == nil || *body.User.Role != "QUANTITY_SURVEYOR" {
		t.Fatalf("wrong profile: %+v", body.User)
	}
	wrong := call(h, "POST", "/api/auth/login", map[string]string{"email": "person@example.test", "password": "wrong-password"}, nil)
	if wrong.Code != 401 {
		t.Fatalf("wrong password status=%d", wrong.Code)
	}
}

func TestLegacyNodeScryptPasswordHash(t *testing.T) {
	encoded := "0123456789abcdef0123456789abcdef:2a6389fa6e25b6b6825dbdc48b528f1ea4664b8f414aaaca42c308771a248049d7ae5077d8c02cac2f5956664a51ea802e02f798daa62c6151aded48d87346cc"
	valid, err := verifyPassword("legacy-password", encoded)
	if err != nil || !valid {
		t.Fatalf("legacy Next.js password hash failed verification: valid=%v err=%v", valid, err)
	}
}

func TestProjectOwnershipMembershipAndCrossProjectDenial(t *testing.T) {
	db, h := testAPI(t)
	owner, ownerID := registerTest(h, t, "owner@example.test", "OWNER")
	other, _ := registerTest(h, t, "other@example.test", "OWNER")
	created := call(h, "POST", "/api/projects", map[string]string{"name": "Home build", "location": "Nairobi", "type": "New build"}, owner)
	if created.Code != 201 {
		t.Fatalf("create status=%d body=%s", created.Code, created.Body.String())
	}
	var body struct {
		Project struct {
			ID      string `json:"id"`
			OwnerID string `json:"ownerId"`
		} `json:"project"`
	}
	_ = json.Unmarshal(created.Body.Bytes(), &body)
	if body.Project.OwnerID != ownerID {
		t.Fatalf("project owner %s != creator %s", body.Project.OwnerID, ownerID)
	}
	var userID, role, status string
	err := db.QueryRow(`SELECT user_id,role,status FROM memberships WHERE project_id=?`, body.Project.ID).Scan(&userID, &role, &status)
	if err != nil || userID != ownerID || role != "OWNER" || status != "ACTIVE" {
		t.Fatalf("owner membership mismatch: %s %s %s err=%v", userID, role, status, err)
	}
	allowed := call(h, "GET", "/api/projects/"+body.Project.ID, nil, owner)
	if allowed.Code != 200 {
		t.Fatalf("owner denied: %d", allowed.Code)
	}
	audit := call(h, "GET", "/api/projects/"+body.Project.ID+"/audit", nil, owner)
	if audit.Code != 200 || !bytes.Contains(audit.Body.Bytes(), []byte("project_created")) {
		t.Fatalf("owner audit access failed: status=%d body=%s", audit.Code, audit.Body.String())
	}
	denied := call(h, "GET", "/api/projects/"+body.Project.ID, nil, other)
	if denied.Code != 404 {
		t.Fatalf("non-member should not see project, status=%d", denied.Code)
	}
	deniedMembers := call(h, "GET", "/api/projects/"+body.Project.ID+"/members", nil, other)
	if deniedMembers.Code != 404 {
		t.Fatalf("non-member should not see members, status=%d", deniedMembers.Code)
	}
	deniedAudit := call(h, "GET", "/api/projects/"+body.Project.ID+"/audit", nil, other)
	if deniedAudit.Code != 404 {
		t.Fatalf("non-member should not see audit history, status=%d", deniedAudit.Code)
	}
}

func TestAuthenticationMiddleware(t *testing.T) {
	_, h := testAPI(t)
	res := call(h, "POST", "/api/projects", map[string]string{"name": "A project", "location": "Nairobi", "type": "Build"}, nil)
	if res.Code != 401 {
		t.Fatalf("unauthenticated project create status=%d", res.Code)
	}
}
