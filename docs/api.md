# Go API (current migration slice)

The Go service returns JSON and is configured through `UBUILD_API_ADDR`, backend-only `DATABASE_URL`, `UBUILD_ALLOWED_ORIGIN`, and `UBUILD_COOKIE_SECURE`. Browser requests use the same-origin Next.js rewrite at `/api/backend/*`; Next.js server-rendered code calls the configured `UBUILD_API_URL` and forwards the incoming cookie.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/healthz` | Public | API/database health |
| POST | `/api/auth/register` | Public, rate limited | Validate and create an account; sets an httpOnly session cookie |
| POST | `/api/auth/login` | Public, rate limited | Authenticate by email/password; sets an httpOnly session cookie |
| POST | `/api/auth/logout` | Public | Revoke current session and clear cookie |
| GET | `/api/auth/me` | Session | Return the authenticated profile |
| GET | `/api/projects` | Session | List projects with active memberships for current user |
| POST | `/api/projects` | Session | Create project (including scope, budget, currency and stage), owner membership and audit entry atomically |
| GET | `/api/projects/{projectId}` | Active project member | Return project and current membership; hides non-member projects with 404 |
| PATCH | `/api/projects/{projectId}` | Owner | Update the project brief: name, location, type, description, scope, budget, currency and construction stage |
| GET | `/api/projects/{projectId}/members` | Owner/coordinator member | List active project memberships |
| GET | `/api/projects/{projectId}/audit` | Active project member | List audit events for that project |

Registration and login error bodies retain the field-error format used by the existing forms. Authentication uses a cryptographically random opaque cookie token, persisted in the database only as a SHA-256 digest. Password hashes are compatible with the existing Node `scrypt` format.

## Marketplace, engagements and project funds

The UBuild marketplace, professional engagements and project payment endpoints
are documented in [ubuild-marketplace-payments.md](ubuild-marketplace-payments.md).
They cover the professional directory and advisory ranking, opportunities and
applications, engagement agreements and variations, payment requests with
deliverables, review/revision and resubmission, explicit client authorization,
funds allocations, project messages, professional financial visibility, the
financial ledger and the provider confirmation intake.

The routes are grouped as follows:

- **Marketplace and opportunities** — `GET /api/opportunities`, `GET /api/opportunities/{opportunityId}` and `POST /api/opportunities/{opportunityId}/applications` for professionals; `GET/POST /api/projects/{projectId}/opportunities`, `POST /api/projects/{projectId}/opportunities/{opportunityId}/close`, `POST /api/projects/{projectId}/applications/{applicationId}/{decide,select,withdraw}` and `GET /api/professionals/me/applications`. Project recommendations are available at `GET /api/projects/{projectId}/recommendations`.
- **Engagements** — `GET/POST /api/projects/{projectId}/engagements`, plus `approve`, `complete`, `variations` and `ratings`.
- **Project funds** — `GET/POST /api/projects/{projectId}/funds`, `POST /api/projects/{projectId}/deposits`, `POST /api/projects/{projectId}/funds/allocate`, `GET /api/projects/{projectId}/allocations`, `POST /api/projects/{projectId}/allocations/{allocationId}/cancel`, `GET /api/projects/{projectId}/ledger` and `GET/PUT /api/projects/{projectId}/provider`.
- **Payment requests** — `GET/POST /api/projects/{projectId}/payment-requests`, `{authorize,reject,revisions,resubmit}` and `GET /api/projects/{projectId}/payment-requests/{requestId}/instructions`.
- **Collaboration and financial visibility** — `GET/POST /api/projects/{projectId}/messages` and `GET /api/projects/{projectId}/financials/me`.

`UBUILD_PROVIDER_SECRET` enables `POST /api/provider/transactions`; without it
the endpoint is disabled. Client authorization never completes a payment on its
own: only a provider confirmation posts the ledger entry and marks the request
paid.

## Migrations

`repository.Open` applies the versioned files once and records each successful
file in `schema_migrations`:

| Dialect | Files |
| --- | --- |
| SQLite (tests) | `001_init.sql`, `002_ubuild.sql`, `003_ubuild.sql`, `004_ubuild_integration.sql` |
| PostgreSQL | `postgres/001_init.sql`, `postgres/002_ubuild.sql`, `postgres/003_ubuild.sql`, `postgres/004_ubuild_integration.sql` |

Migration `004_ubuild_integration.sql` is additive and idempotent. It adds the
project brief/stage columns, stage and opportunity links on engagements, and the
engagement/stage links on documents and milestones, then creates
`opportunities`, `opportunity_applications`, `funds_allocations` and
`project_messages`. Existing databases are upgraded in place; no data is reset.
