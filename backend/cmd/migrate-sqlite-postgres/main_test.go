package main

import (
	"path/filepath"
	"testing"

	"github.com/ubuild/backend/internal/repository"
)

func TestCopyTableUsesPortableParametersAndNormalizesEmail(t *testing.T) {
	source, err := repository.Open(filepath.Join(t.TempDir(), "source.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer source.Close()
	_, err = source.Exec(`INSERT INTO users(id,name,email,password_hash,profile_role,created_at) VALUES($1,$2,$3,$4,$5,$6)`, "u1", "Test User", " TEST@EXAMPLE.TEST ", "hash", "OWNER", "2026-01-01T00:00:00Z")
	if err != nil {
		t.Fatal(err)
	}

	target, err := repository.Open(filepath.Join(t.TempDir(), "target.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer target.Close()
	tx, err := target.Begin()
	if err != nil {
		t.Fatal(err)
	}
	count, err := copyTable(source, tx, "users")
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("copied %d rows, want 1", count)
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
	var email string
	if err = target.QueryRow(`SELECT email FROM users WHERE id=$1`, "u1").Scan(&email); err != nil {
		t.Fatal(err)
	}
	if email != "test@example.test" {
		t.Fatalf("email was not normalized: %q", email)
	}
}
