package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ubuild/backend/internal/repository"
)

type User struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	PasswordHash string  `json:"passwordHash"`
	ProfileRole  *string `json:"profileRole"`
	CreatedAt    string  `json:"createdAt"`
}
type Session struct {
	Token     string `json:"token"`
	UserID    string `json:"userId"`
	CreatedAt string `json:"createdAt"`
}
type Project struct {
	ID          string `json:"id"`
	OwnerID     string `json:"ownerId"`
	Name        string `json:"name"`
	Location    string `json:"location"`
	Type        string `json:"type"`
	Description string `json:"description"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}
type Membership struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	ProjectID string `json:"projectId"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	JoinedAt  string `json:"joinedAt"`
	UpdatedAt string `json:"updatedAt"`
}
type Invitation struct {
	ID         string  `json:"id"`
	ProjectID  string  `json:"projectId"`
	InvitedBy  string  `json:"invitedByUserId"`
	Email      string  `json:"email"`
	Role       string  `json:"role"`
	Token      string  `json:"token"`
	Status     string  `json:"status"`
	CreatedAt  string  `json:"createdAt"`
	ExpiresAt  string  `json:"expiresAt"`
	AcceptedAt *string `json:"acceptedAt"`
}
type Audit struct {
	ID        string `json:"id"`
	ProjectID string `json:"projectId"`
	UserID    string `json:"userId"`
	Action    string `json:"action"`
	Details   string `json:"details"`
	CreatedAt string `json:"createdAt"`
}
type Reset struct {
	ID        string  `json:"id"`
	UserID    string  `json:"userId"`
	Token     string  `json:"token"`
	ExpiresAt string  `json:"expiresAt"`
	UsedAt    *string `json:"usedAt"`
	CreatedAt string  `json:"createdAt"`
}
type Contact struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	Phone       *string `json:"phone"`
	ProjectType *string `json:"projectType"`
	Location    *string `json:"location"`
	Budget      *string `json:"budget"`
	Message     string  `json:"message"`
	SubmittedAt string  `json:"submittedAt"`
}
type Newsletter struct {
	Email      string `json:"email"`
	SignedUpAt string `json:"signedUpAt"`
}

func main() {
	source := flag.String("source", "../data", "Path to the legacy JSON data directory")
	database := flag.String("database", envOr("DATABASE_URL", "./data/ubuild.db"), "PostgreSQL DATABASE_URL or local SQLite path")
	flag.Parse()
	db, err := repository.Open(*database)
	if err != nil {
		fatal(err)
	}
	defer db.Close()
	for _, table := range []string{"users", "projects", "memberships", "sessions", "invitations", "audit_entries", "password_resets", "contact_submissions", "newsletter_signups"} {
		var count int
		if err = db.QueryRow("SELECT count(*) FROM " + table).Scan(&count); err != nil {
			fatal(err)
		}
		if count != 0 {
			fatal(fmt.Errorf("target database table %s is not empty; refusing to import", table))
		}
	}
	users := load[[]User](*source, "users.json")
	sessions := load[[]Session](*source, "sessions.json")
	projects := load[[]Project](*source, "projects.json")
	members := load[[]Membership](*source, "memberships.json")
	invitations := load[[]Invitation](*source, "invitations.json")
	audits := load[[]Audit](*source, "audit.json")
	resets := load[[]Reset](*source, "password-resets.json")
	contacts := load[[]Contact](*source, "contact-submissions.json")
	newsletters := load[[]Newsletter](*source, "newsletter.json")
	tx, err := db.Begin()
	if err != nil {
		fatal(err)
	}
	defer tx.Rollback()
	for _, v := range users {
		_, err = tx.Exec(`INSERT INTO users(id,name,email,password_hash,profile_role,created_at) VALUES($1,$2,$3,$4,$5,$6)`, v.ID, v.Name, strings.ToLower(strings.TrimSpace(v.Email)), v.PasswordHash, v.ProfileRole, v.CreatedAt)
		check(err)
	}
	for _, v := range projects {
		_, err = tx.Exec(`INSERT INTO projects(id,owner_id,name,location,type,description,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, v.ID, v.OwnerID, v.Name, v.Location, v.Type, v.Description, v.CreatedAt, v.UpdatedAt)
		check(err)
	}
	for _, v := range members {
		_, err = tx.Exec(`INSERT INTO memberships(id,user_id,project_id,role,status,joined_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, v.ID, v.UserID, v.ProjectID, v.Role, v.Status, v.JoinedAt, v.UpdatedAt)
		check(err)
	}
	for _, v := range sessions {
		_, err = tx.Exec(`INSERT INTO sessions(token_hash,user_id,created_at) VALUES($1,$2,$3)`, hash(v.Token), v.UserID, v.CreatedAt)
		check(err)
	}
	for _, v := range invitations {
		_, err = tx.Exec(`INSERT INTO invitations(id,project_id,invited_by_user_id,email,role,token,status,created_at,expires_at,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, v.ID, v.ProjectID, v.InvitedBy, strings.ToLower(strings.TrimSpace(v.Email)), v.Role, v.Token, v.Status, v.CreatedAt, v.ExpiresAt, v.AcceptedAt)
		check(err)
	}
	for _, v := range audits {
		_, err = tx.Exec(`INSERT INTO audit_entries(id,project_id,user_id,action,details,created_at) VALUES($1,$2,$3,$4,$5,$6)`, v.ID, v.ProjectID, v.UserID, v.Action, v.Details, v.CreatedAt)
		check(err)
	}
	for _, v := range resets {
		_, err = tx.Exec(`INSERT INTO password_resets(id,user_id,token,expires_at,used_at,created_at) VALUES($1,$2,$3,$4,$5,$6)`, v.ID, v.UserID, v.Token, v.ExpiresAt, v.UsedAt, v.CreatedAt)
		check(err)
	}
	for _, v := range contacts {
		_, err = tx.Exec(`INSERT INTO contact_submissions(id,name,email,phone,project_type,location,budget,message,submitted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, v.ID, v.Name, strings.ToLower(strings.TrimSpace(v.Email)), v.Phone, v.ProjectType, v.Location, v.Budget, v.Message, v.SubmittedAt)
		check(err)
	}
	for _, v := range newsletters {
		_, err = tx.Exec(`INSERT INTO newsletter_signups(email,signed_up_at) VALUES($1,$2)`, strings.ToLower(strings.TrimSpace(v.Email)), v.SignedUpAt)
		check(err)
	}
	if err = tx.Commit(); err != nil {
		fatal(err)
	}
	fmt.Printf("Imported users=%d projects=%d memberships=%d sessions=%d invitations=%d audit=%d contacts=%d newsletters=%d\n", len(users), len(projects), len(members), len(sessions), len(invitations), len(audits), len(contacts), len(newsletters))
}
func load[T any](dir, name string) T {
	var result T
	b, err := os.ReadFile(filepath.Join(dir, name))
	if errors.Is(err, os.ErrNotExist) {
		return result
	}
	if err != nil {
		fatal(err)
	}
	if err = json.Unmarshal(b, &result); err != nil {
		fatal(fmt.Errorf("parse %s: %w", name, err))
	}
	return result
}
func check(err error) {
	if err != nil {
		fatal(err)
	}
}
func fatal(err error)      { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
func hash(s string) string { sum := sha256.Sum256([]byte(s)); return hex.EncodeToString(sum[:]) }
func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
