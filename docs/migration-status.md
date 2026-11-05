# Backend migration status

## Migrated in this slice

- Go HTTP API with environment-based configuration and PostgreSQL as the default runtime database. SQLite remains available for tests and one-time legacy data transfer.
- Registration validation (including confirmation), email normalization, role validation, duplicate prevention, scrypt hashing, login, logout, and current-profile lookup.
- Project list/detail/create APIs and project audit history. Each API request authenticates from an httpOnly session cookie; project reads require an active project membership. Creation atomically creates the project, owner membership, and audit event.
- One-time JSON importer for legacy users, sessions, projects, memberships, invitations, audit entries, password resets, contact submissions, and newsletter signups.
- SQLite-to-PostgreSQL migration has been executed for this local checkout; the SQLite source is retained, and the PostgreSQL API was smoke-tested against a disposable database.
- Existing Next.js frontend has been moved to `frontend/`; registration, login, logout, dashboard data, and project creation now call the Go API.

## Still in Next.js / pending

- Contact and newsletter endpoints remain under `frontend/app/api`.
- Project invitations, member administration, invitation acceptance/revocation, and password recovery are still implemented by the old Next.js backend.
- Project team management, invitations, and some project-specific dashboard pages and access checks still read legacy JSON data. They are not yet migrated to Go; use the migrated project overview, activity view, and supported API routes during this transition.
- The duplicate Next.js registration/login/logout/profile and project list/create/detail/audit handlers have been removed after switching their callers to Go. Next.js still owns contact/newsletter, password recovery, and legacy invitation/member management handlers.
- Budget, milestones, reports, approvals, and document workflows are not implemented as data-backed features.
- Configure the real production PostgreSQL `DATABASE_URL` only in backend environments. The Render blueprint provisions a new PostgreSQL database; it is separate from this local migrated DB and must receive the deployment's existing data before production cutover.
