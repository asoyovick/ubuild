package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Environment       string
	Address           string
	DatabaseURL       string
	AllowedOrigin     string
	CookieSecure      bool
	UploadDir         string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
}

func Load() (Config, error) {
	environment := strings.ToLower(strings.TrimSpace(env("UBUILD_ENV", defaultEnvironment())))
	port := env("PORT", "8080")

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		if environment == "production" {
			return Config{}, errors.New("DATABASE_URL must be set when UBUILD_ENV=production")
		}
		databaseURL = "postgres://ubuild:ubuild@localhost:5432/ubuild?sslmode=disable"
	}

	allowedOrigin := strings.TrimRight(env("UBUILD_ALLOWED_ORIGIN", "http://localhost:3000"), "/")
	if environment == "production" {
		if !isPostgresURL(databaseURL) {
			return Config{}, errors.New("DATABASE_URL must be a postgres:// or postgresql:// URL in production")
		}
		if os.Getenv("UBUILD_ALLOWED_ORIGIN") == "" {
			return Config{}, errors.New("UBUILD_ALLOWED_ORIGIN must be set when UBUILD_ENV=production")
		}
		if !strings.HasPrefix(allowedOrigin, "https://") {
			return Config{}, errors.New("UBUILD_ALLOWED_ORIGIN must use https:// in production")
		}
	}

	cookieSecure := environment == "production"
	if raw, ok := os.LookupEnv("UBUILD_COOKIE_SECURE"); ok && raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return Config{}, fmt.Errorf("UBUILD_COOKIE_SECURE must be true or false: %w", err)
		}
		cookieSecure = value
	}

	maxOpen, err := envInt("UBUILD_DB_MAX_OPEN_CONNS", 10)
	if err != nil {
		return Config{}, err
	}
	maxIdle, err := envInt("UBUILD_DB_MAX_IDLE_CONNS", 5)
	if err != nil {
		return Config{}, err
	}
	if maxOpen < 1 {
		return Config{}, errors.New("UBUILD_DB_MAX_OPEN_CONNS must be at least 1")
	}
	if maxIdle < 0 {
		return Config{}, errors.New("UBUILD_DB_MAX_IDLE_CONNS cannot be negative")
	}
	if maxIdle > maxOpen {
		maxIdle = maxOpen
	}

	return Config{
		Environment:    environment,
		Address:        env("UBUILD_API_ADDR", "0.0.0.0:"+port),
		DatabaseURL:    databaseURL,
		AllowedOrigin:  allowedOrigin,
		CookieSecure:   cookieSecure,
		UploadDir:      env("UBUILD_UPLOAD_DIR", "data/uploads"),
		DBMaxOpenConns: maxOpen,
		DBMaxIdleConns: maxIdle,
	}, nil
}

func defaultEnvironment() string {
	if strings.EqualFold(os.Getenv("RENDER"), "true") {
		return "production"
	}
	return "development"
}

func isPostgresURL(value string) bool {
	return strings.HasPrefix(value, "postgres://") || strings.HasPrefix(value, "postgresql://")
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer: %w", key, err)
	}
	return parsed, nil
}
