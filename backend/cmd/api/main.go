package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ubuild/backend/internal/config"
	"github.com/ubuild/backend/internal/handler"
	"github.com/ubuild/backend/internal/repository"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := repository.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	srv := &http.Server{Addr: cfg.Address, Handler: (&handler.API{DB: db, Origin: cfg.AllowedOrigin, CookieSecure: cfg.CookieSecure, UploadDir: cfg.UploadDir}).Handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 60 * time.Second, IdleTimeout: 60 * time.Second}
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-stop
		ctxDone := make(chan struct{})
		go func() { defer close(ctxDone); _ = srv.Close() }()
		<-ctxDone
	}()
	log.Printf("UBuild API listening on %s", cfg.Address)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
