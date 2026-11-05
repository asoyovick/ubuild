package main

import (
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/ubuild/backend/internal/repository"
)

var tables = []string{
	"users", "projects", "memberships", "sessions", "invitations",
	"audit_entries", "password_resets", "contact_submissions", "newsletter_signups",
}

func main() {
	sourcePath := flag.String("source", "./data/ubuild.db", "Path to the existing SQLite database")
	targetURL := flag.String("target", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL (or DATABASE_URL)")
	flag.Parse()
	if *targetURL == "" {
		fatal(errors.New("provide -target or set DATABASE_URL"))
	}
	if !strings.HasPrefix(*targetURL, "postgres://") && !strings.HasPrefix(*targetURL, "postgresql://") {
		fatal(errors.New("target must be a postgres:// or postgresql:// URL"))
	}

	if _, err := os.Stat(*sourcePath); err != nil {
		fatal(fmt.Errorf("SQLite source not found: %w", err))
	}
	source, err := sql.Open("sqlite", *sourcePath)
	if err != nil {
		fatal(fmt.Errorf("open SQLite source: %w", err))
	}
	defer source.Close()
	if err = source.Ping(); err != nil {
		fatal(fmt.Errorf("connect to SQLite source: %w", err))
	}
	target, err := repository.Open(*targetURL)
	if err != nil {
		fatal(fmt.Errorf("open PostgreSQL target: %w", err))
	}
	defer target.Close()
	for _, table := range tables {
		var existing int
		if err = target.QueryRow(`SELECT count(*) FROM ` + table).Scan(&existing); err != nil {
			fatal(err)
		}
		if existing != 0 {
			fatal(fmt.Errorf("PostgreSQL target table %s is not empty; refusing to migrate", table))
		}
	}
	var sourceUsers int
	if err = source.QueryRow(`SELECT count(*) FROM users`).Scan(&sourceUsers); err != nil {
		fatal(err)
	}
	if sourceUsers == 0 {
		fatal(errors.New("SQLite source contains no users; refusing to migrate an empty source"))
	}

	tx, err := target.Begin()
	if err != nil {
		fatal(err)
	}
	defer tx.Rollback()
	counts := make(map[string]int)
	for _, table := range tables {
		counts[table], err = copyTable(source, tx, table)
		if err != nil {
			fatal(fmt.Errorf("copy %s: %w", table, err))
		}
	}
	if err = tx.Commit(); err != nil {
		fatal(fmt.Errorf("commit PostgreSQL migration: %w", err))
	}
	fmt.Printf("Migrated SQLite data to PostgreSQL: users=%d projects=%d memberships=%d sessions=%d invitations=%d audit=%d password_resets=%d contacts=%d newsletters=%d\n",
		counts["users"], counts["projects"], counts["memberships"], counts["sessions"], counts["invitations"], counts["audit_entries"], counts["password_resets"], counts["contact_submissions"], counts["newsletter_signups"])
}

func copyTable(source *sql.DB, target *sql.Tx, table string) (int, error) {
	rows, err := source.Query(`SELECT * FROM ` + table)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	columns, err := rows.Columns()
	if err != nil {
		return 0, err
	}
	placeholders := make([]string, len(columns))
	for i := range columns {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, strings.Join(columns, ","), strings.Join(placeholders, ","))
	count := 0
	for rows.Next() {
		values := make([]any, len(columns))
		dest := make([]any, len(columns))
		for i := range values {
			dest[i] = &values[i]
		}
		if err = rows.Scan(dest...); err != nil {
			return count, err
		}
		if table == "users" {
			for i, column := range columns {
				if column == "email" {
					if email, ok := values[i].(string); ok {
						values[i] = strings.ToLower(strings.TrimSpace(email))
					}
				}
			}
		}
		if table == "invitations" || table == "contact_submissions" || table == "newsletter_signups" {
			for i, column := range columns {
				if column == "email" {
					if email, ok := values[i].(string); ok {
						values[i] = strings.ToLower(strings.TrimSpace(email))
					}
				}
			}
		}
		if _, err = target.Exec(query, values...); err != nil {
			return count, err
		}
		count++
	}
	return count, rows.Err()
}

func fatal(err error) { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
