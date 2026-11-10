package repository

import (
	"database/sql"
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
