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
| POST | `/api/projects` | Session | Create project, owner membership, and audit entry atomically |
| GET | `/api/projects/{projectId}` | Active project member | Return project and current membership; hides non-member projects with 404 |
| GET | `/api/projects/{projectId}/members` | Owner/coordinator member | List active project memberships |
| GET | `/api/projects/{projectId}/audit` | Active project member | List audit events for that project |

Registration and login error bodies retain the field-error format used by the existing forms. Authentication uses a cryptographically random opaque cookie token, persisted in the database only as a SHA-256 digest. Password hashes are compatible with the existing Node `scrypt` format.
