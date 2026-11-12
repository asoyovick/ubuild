package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

// PoolConfig controls the PostgreSQL connection pool. A zero value keeps the
// conservative defaults used by command-line tools such as the data importer.
type PoolConfig struct {
	MaxOpenConns int
	MaxIdleConns int
}

func Open(target string) (*sql.DB, error) {
	return OpenWithPool(target, PoolConfig{})
}

func OpenWithPool(target string, pool PoolConfig) (*sql.DB, error) {
	postgres := strings.HasPrefix(target, "postgres://") || strings.HasPrefix(target, "postgresql://")
	driver := "sqlite"
	migrations := migrationFiles("")
	if postgres {
		driver = "pgx"
		migrations = migrationFiles("postgres")
	} else {
		if err := os.MkdirAll(filepath.Dir(target), 0700); err != nil {
			return nil, err
		}
		file, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR, 0600)
		if err != nil {
			return nil, err
		}
		if err = file.Close(); err != nil {
			return nil, err
		}
		if err = os.Chmod(target, 0600); err != nil {
			return nil, err
		}
	}
	db, err := sql.Open(driver, target)
	if err != nil {
		return nil, err
	}
	if postgres {
		maxOpen := pool.MaxOpenConns
		if maxOpen <= 0 {
			maxOpen = 10
		}
		maxIdle := pool.MaxIdleConns
		if maxIdle <= 0 {
			maxIdle = 5
		}
		if maxIdle > maxOpen {
			maxIdle = maxOpen
		}
		db.SetMaxOpenConns(maxOpen)
		db.SetMaxIdleConns(maxIdle)
		db.SetConnMaxLifetime(30 * time.Minute)
		db.SetConnMaxIdleTime(5 * time.Minute)
	} else {
		db.SetMaxOpenConns(1)
		if _, err = db.Exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;"); err != nil {
			db.Close()
			return nil, err
		}
	}
	if err = db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	if err = applyMigrations(db, migrations); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

// migrationFiles lists the migrations that must be applied for a dialect.
// PostgreSQL keeps its own copy of files that differ from SQLite; both
// directories use the same version-named files so the applied version history
// is comparable.
func migrationFiles(dialect string) []string {
	names := []string{
		"001_init.sql",
		"002_ubuild.sql",
		"003_ubuild.sql",
		"004_ubuild_integration.sql",
	}
	files := make([]string, 0, len(names))
	for _, name := range names {
		if dialect != "" {
			name = filepath.Join(dialect, name)
		}
		files = append(files, name)
	}
	return files
}

// applyMigrations runs each migration file exactly once, recording the applied
// version. Migrations are additive and never destroy existing data. A database
// that predates version tracking has its idempotent 001/002 files re-applied
// once and is then recorded, which is safe because those files use
// CREATE ... IF NOT EXISTS.
func applyMigrations(db *sql.DB, migrations []string) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, migration := range migrations {
		applied, err := migrationApplied(db, migration)
		if err != nil {
			return err
		}
		if applied {
			continue
		}
		schema, err := readMigration(migration)
		if err != nil {
			return err
		}
		statements, err := splitStatements(string(schema))
		if err != nil {
			return fmt.Errorf("parse schema %s: %w", migration, err)
		}
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin schema %s: %w", migration, err)
		}
		for _, statement := range statements {
			if _, err = tx.Exec(statement); err != nil {
				_ = tx.Rollback()
				return fmt.Errorf("apply schema %s: %w", migration, err)
			}
		}
		if _, err = tx.Exec(`INSERT INTO schema_migrations(version,applied_at) VALUES($1,$2)`, migration, time.Now().UTC().Format(time.RFC3339Nano)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record schema %s: %w", migration, err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("commit schema %s: %w", migration, err)
		}
	}
	return nil
}

func migrationApplied(db *sql.DB, version string) (bool, error) {
	var exists int
	err := db.QueryRow(`SELECT 1 FROM schema_migrations WHERE version=$1`, version).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func readMigration(name string) ([]byte, error) {
	schema, err := os.ReadFile(filepath.Join("migrations", name))
	if err == nil {
		return schema, nil
	}
	_, source, _, _ := runtime.Caller(0)
	return os.ReadFile(filepath.Join(filepath.Dir(source), "..", "..", "migrations", name))
}

// splitStatements splits a SQL file into executable statements. It understands
// single-quoted strings, double-quoted identifiers, line comments, block
// comments and PostgreSQL dollar-quoted bodies so that a DO $$ ... $$ block is
// sent as one statement rather than being cut at an inner semicolon.
func splitStatements(sqlText string) ([]string, error) {
	statements := []string{}
	var current strings.Builder
	inSingle, inDouble, inLineComment, inBlockComment := false, false, false, false
	var dollarTag string

	for i := 0; i < len(sqlText); i++ {
		c := sqlText[i]
		if inLineComment {
			current.WriteByte(c)
			if c == '\n' {
				inLineComment = false
			}
			continue
		}
		if inBlockComment {
			current.WriteByte(c)
			if c == '*' && i+1 < len(sqlText) && sqlText[i+1] == '/' {
				current.WriteByte('/')
				i++
				inBlockComment = false
			}
			continue
		}
		if dollarTag != "" {
			if strings.HasPrefix(sqlText[i:], dollarTag) {
				current.WriteString(dollarTag)
				i += len(dollarTag) - 1
				dollarTag = ""
				continue
			}
			current.WriteByte(c)
			continue
		}
		if inSingle {
			current.WriteByte(c)
			if c == '\'' {
				if i+1 < len(sqlText) && sqlText[i+1] == '\'' {
					current.WriteByte('\'')
					i++
					continue
				}
				inSingle = false
			}
			continue
		}
		if inDouble {
			current.WriteByte(c)
			if c == '"' {
				inDouble = false
			}
			continue
		}
		switch {
		case c == '-' && i+1 < len(sqlText) && sqlText[i+1] == '-':
			current.WriteString("--")
			i++
			inLineComment = true
		case c == '/' && i+1 < len(sqlText) && sqlText[i+1] == '*':
			current.WriteString("/*")
			i++
			inBlockComment = true
		case c == '\'':
			current.WriteByte(c)
			inSingle = true
		case c == '"':
			current.WriteByte(c)
			inDouble = true
		case c == '$':
			tag, ok := dollarQuoteTag(sqlText[i:])
			if ok {
				current.WriteString(tag)
				i += len(tag) - 1
				dollarTag = tag
			} else {
				current.WriteByte(c)
			}
		case c == ';':
			if statement := strings.TrimSpace(current.String()); statement != "" {
				statements = append(statements, statement)
			}
			current.Reset()
		default:
			current.WriteByte(c)
		}
	}
	if inSingle || inDouble || inBlockComment || dollarTag != "" {
		return nil, fmt.Errorf("unterminated SQL literal or comment")
	}
	if statement := strings.TrimSpace(current.String()); statement != "" {
		statements = append(statements, statement)
	}
	return statements, nil
}

func dollarQuoteTag(text string) (string, bool) {
	if !strings.HasPrefix(text, "$") {
		return "", false
	}
	end := strings.IndexByte(text[1:], '$')
	if end < 0 {
		return "", false
	}
	tag := text[:end+2]
	for _, r := range tag[1 : len(tag)-1] {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_') {
			return "", false
		}
	}
	return tag, true
}
