-- Migration 004 (SQLite): integrate marketplace, project delivery and project
-- funds around the same project, user, engagement, stage and document records.
-- Additive only. Applied once and recorded in schema_migrations.

-- A project records the brief, budget and current construction stage that the
-- marketplace, recommendations and funds allocations all refer to.
ALTER TABLE projects ADD COLUMN scope TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN budget_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN currency TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE projects ADD COLUMN construction_stage TEXT NOT NULL DEFAULT 'DESIGN';

-- A professional chooses (or is assigned) the project role held when an
-- engagement is approved. It never grants project access on its own.
ALTER TABLE professionals ADD COLUMN project_role TEXT NOT NULL DEFAULT 'CONTRACTOR';

-- Engagements are always scoped to one construction stage and may originate
-- from a published opportunity/application.
ALTER TABLE engagements ADD COLUMN construction_stage TEXT NOT NULL DEFAULT 'DESIGN';
ALTER TABLE engagements ADD COLUMN opportunity_id TEXT NOT NULL DEFAULT '';
ALTER TABLE engagements ADD COLUMN application_id TEXT NOT NULL DEFAULT '';
ALTER TABLE engagements ADD COLUMN start_date TEXT NOT NULL DEFAULT '';
ALTER TABLE engagements ADD COLUMN end_date TEXT NOT NULL DEFAULT '';

-- Deliverables and progress milestones can point at the engagement that
-- produced or is responsible for them.
ALTER TABLE documents ADD COLUMN engagement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN construction_stage TEXT NOT NULL DEFAULT '';
ALTER TABLE milestones ADD COLUMN engagement_id TEXT NOT NULL DEFAULT '';
ALTER TABLE milestones ADD COLUMN construction_stage TEXT NOT NULL DEFAULT '';

-- Client-published professional opportunities and professional applications.
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

-- Client earmarks against a construction stage and, optionally, the specific
-- engagement the earmark is intended for. Allocations are planning records;
-- payment authorization still checks the provider-confirmed balance.
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

-- Project communication. An engaged professional becomes an active project
-- member when the engagement is approved, so the same records are visible to
-- the client and the professional without a parallel conversation store.
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

-- One application per professional per open opportunity is enforced above; one
-- selected application per opportunity is enforced by the service within the
-- transaction that awards the opportunity.
