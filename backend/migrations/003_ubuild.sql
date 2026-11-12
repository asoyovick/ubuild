-- Migration 003 (SQLite): fund allocation tracking on project_funds_accounts.
-- This file is recorded in schema_migrations after its first successful run, so
-- the ALTER statements below are not re-applied. PostgreSQL uses the
-- equivalent idempotent DO block in migrations/postgres/003_ubuild.sql.

ALTER TABLE project_funds_accounts ADD COLUMN allocated_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE project_funds_accounts ADD COLUMN construction_stage TEXT NOT NULL DEFAULT 'DESIGN';
ALTER TABLE project_funds_accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'KES';
