-- Migration 003 (PostgreSQL): fund allocation tracking on project_funds_accounts.
-- Additive only and idempotent. The migration runner records this file in
-- schema_migrations; the guards below also keep it safe for databases that were
-- upgraded manually before version tracking existed.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_funds_accounts' AND column_name = 'allocated_cents') THEN
        ALTER TABLE project_funds_accounts ADD COLUMN allocated_cents BIGINT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_funds_accounts' AND column_name = 'construction_stage') THEN
        ALTER TABLE project_funds_accounts ADD COLUMN construction_stage TEXT NOT NULL DEFAULT 'DESIGN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_funds_accounts' AND column_name = 'currency') THEN
        ALTER TABLE project_funds_accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'KES';
    END IF;
END $$;
