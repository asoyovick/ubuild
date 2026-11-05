package repository

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

func Open(target string) (*sql.DB, error) {
	postgres := strings.HasPrefix(target, "postgres://") || strings.HasPrefix(target, "postgresql://")
	driver, migration := "sqlite", "001_init.sql"
	if postgres {
		driver, migration = "pgx", filepath.Join("postgres", "001_init.sql")
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
		db.SetMaxOpenConns(20)
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
	schema, err := os.ReadFile(filepath.Join("migrations", migration))
	if err != nil {
		_, source, _, _ := runtime.Caller(0)
		schema, err = os.ReadFile(filepath.Join(filepath.Dir(source), "..", "..", "migrations", migration))
	}
	if err != nil {
		db.Close()
		return nil, err
	}
	for _, statement := range strings.Split(string(schema), ";") {
		if strings.TrimSpace(statement) == "" {
			continue
		}
		if _, err = db.Exec(statement); err != nil {
			db.Close()
			return nil, fmt.Errorf("apply schema: %w", err)
		}
	}
	return db, nil
}
