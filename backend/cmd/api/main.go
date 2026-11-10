package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"syscall"
	"time"

	"github.com/ubuild/backend/internal/config"
	"github.com/ubuild/backend/internal/handler"
	"github.com/ubuild/backend/internal/repository"
)

const shutdownTimeout = 15 * time.Second

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	if err := run(); err != nil {
		log.Fatalf("UBuild API failed: %s", redact(err.Error()))
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	db, err := repository.OpenWithPool(cfg.DatabaseURL, repository.PoolConfig{
		MaxOpenConns: cfg.DBMaxOpenConns,
		MaxIdleConns: cfg.DBMaxIdleConns,
	})
	if err != nil {
		return fmt.Errorf("initialize database: %w", err)
	}
	defer db.Close()

	srv := &http.Server{
		Addr: cfg.Address,
		Handler: (&handler.API{
			DB:           db,
			Origin:       cfg.AllowedOrigin,
			CookieSecure: cfg.CookieSecure,
			UploadDir:    cfg.UploadDir,
		}).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("UBuild API starting env=%s addr=%s", cfg.Environment, cfg.Address)
		serverErrors <- srv.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(stop)

	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve HTTP: %w", err)
		}
		return nil
	case sig := <-stop:
		log.Printf("received %s; shutting down gracefully within %s", sig, shutdownTimeout)
		ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			_ = srv.Close()
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		if err := <-serverErrors; err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve HTTP: %w", err)
		}
		log.Printf("UBuild API stopped")
		return nil
	}
}

var (
	urlPasswordPattern = regexp.MustCompile(`(?i)(postgres(?:ql)?://[^:/\s]+:)[^@\s]+@`)
	dsnPasswordPattern = regexp.MustCompile(`(?i)(password=)[^&\s]+`)
)

// redact prevents database credentials from being written to Render logs when
// a connection or configuration error includes the connection string.
func redact(message string) string {
	message = urlPasswordPattern.ReplaceAllString(message, `${1}***@`)
	return dsnPasswordPattern.ReplaceAllString(message, `${1}***`)
}
