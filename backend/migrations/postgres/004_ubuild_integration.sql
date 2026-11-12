-- Migration 004 (PostgreSQL): integrate marketplace, project delivery and
-- project funds around the same project, user, engagement, stage and document
-- records. Additive only and recorded in schema_migrations after a successful
-- run.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_stage TEXT NOT NULL DEFAULT 'DESIGN';

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS project_role TEXT NOT NULL DEFAULT 'CONTRACTOR';

ALTER TABLE engagements ADD COLUMN IF NOT EXISTS construction_stage TEXT NOT NULL DEFAULT 'DESIGN';
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS opportunity_id TEXT NOT NULL DEFAULT '';
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS application_id TEXT NOT NULL DEFAULT '';
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS start_date TEXT NOT NULL DEFAULT '';
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS end_date TEXT NOT NULL DEFAULT '';

ALTER TABLE documents ADD COLUMN IF NOT EXISTS engagement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS construction_stage TEXT NOT NULL DEFAULT '';
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS engagement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS construction_stage TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  construction_stage TEXT NOT NULL,
  scope TEXT NOT NULL,
  deliverables TEXT NOT NULL DEFAULT '',
  budget_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  deadline TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunity_applications (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  professional_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL DEFAULT '',
  proposed_fee_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  availability_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(opportunity_id, professional_id)
);

CREATE TABLE IF NOT EXISTS funds_allocations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL DEFAULT '',
  construction_stage TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunities_project ON opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON opportunity_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_professional ON opportunity_applications(professional_id);
CREATE INDEX IF NOT EXISTS idx_funds_allocations_project ON funds_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_funds_allocations_engagement ON funds_allocations(engagement_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_engagement ON documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_milestones_engagement ON milestones(engagement_id);
