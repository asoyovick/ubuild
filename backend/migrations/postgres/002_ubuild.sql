-- UBuild marketplace, engagement and project-funds schema.
-- Additive only: every statement creates a new table or index and never alters
-- or drops an existing record.

CREATE TABLE IF NOT EXISTS professionals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT '',
  disciplines TEXT NOT NULL DEFAULT '',
  qualifications TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'AVAILABLE',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS engagements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id),
  professional_id TEXT NOT NULL REFERENCES users(id),
  scope TEXT NOT NULL,
  deliverables TEXT NOT NULL DEFAULT '',
  timeline TEXT NOT NULL DEFAULT '',
  fee_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  terms_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS professional_ratings (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(engagement_id, client_id)
);

CREATE TABLE IF NOT EXISTS engagement_variations (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id),
  scope TEXT NOT NULL DEFAULT '',
  deliverables TEXT NOT NULL DEFAULT '',
  timeline TEXT NOT NULL DEFAULT '',
  fee_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_providers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  arrangement TEXT NOT NULL,
  name TEXT NOT NULL,
  display_account TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'CONFIGURED',
  disclosures TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_funds_accounts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  balance_cents BIGINT NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  professional_id TEXT NOT NULL REFERENCES users(id),
  client_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  deliverable_ids TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  requested_by TEXT NOT NULL REFERENCES users(id),
  requested_at TEXT NOT NULL,
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at TEXT,
  decision_note TEXT NOT NULL DEFAULT '',
  provider_reference TEXT NOT NULL DEFAULT '',
  provider_status TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_instructions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_request_id TEXT NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_ledger (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL DEFAULT '',
  payment_request_id TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  description TEXT NOT NULL,
  balance_after_cents BIGINT NOT NULL DEFAULT 0,
  provider_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  created_at TEXT NOT NULL,
  posted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_engagements_project ON engagements(project_id);
CREATE INDEX IF NOT EXISTS idx_engagements_professional ON engagements(professional_id);
CREATE INDEX IF NOT EXISTS idx_variations_engagement ON engagement_variations(engagement_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_project ON payment_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_engagement ON payment_requests(engagement_id);
CREATE INDEX IF NOT EXISTS idx_payment_instructions_request ON payment_instructions(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_project ON financial_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_professional_ratings_professional ON professional_ratings(professional_id);

-- Only one payment request may be open at a time on an engagement, so two
-- concurrent submissions cannot both consume the same agreed fee.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_requests_one_open ON payment_requests(engagement_id) WHERE status = 'SUBMITTED';
