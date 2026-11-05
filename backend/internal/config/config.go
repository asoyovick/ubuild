package config

import (
	"os"
	"strings"
)

type Config struct {
	Address       string
	DatabaseURL   string
	AllowedOrigin string
	CookieSecure  bool
}

func Load() (Config, error) {
	port := env("PORT", "8080")
	c := Config{
		Address:       env("UBUILD_API_ADDR", ":"+port),
		DatabaseURL:   env("DATABASE_URL", "postgres://ubuild:ubuild@localhost:5432/ubuild?sslmode=disable"),
		AllowedOrigin: env("UBUILD_ALLOWED_ORIGIN", "http://localhost:3000"),
		CookieSecure:  strings.EqualFold(os.Getenv("UBUILD_COOKIE_SECURE"), "true"),
	}
	return c, nil
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
