# UBuild marketplace, engagements and project funds

This slice adds the construction marketplace, professional engagement and project
payment flow to the existing UBuild platform. It extends the shared records
(`users`, `projects`, `memberships`, `audit_entries`) rather than creating a
parallel system, so a project, its client, its professionals, its engagements
and its documents are the same records everywhere.

Marketplace discovery, project delivery and project funds are one workflow:

1. A client publishes a project with scope, budget, location and current stage.
2. The client publishes a stage-scoped opportunity and professionals apply.
3. The client reviews applications and selects one, which proposes an engagement.
4. The client approves the agreed terms; approval creates the professional's
   active project membership (never `OWNER`) and is the only thing that makes
   payment requests possible.
5. Funds are earmarked by stage/engagement as planning records, then a
   professional requests payment against the engagement and agreed deliverables.
6. The client authorizes, rejects or requests changes; the provider confirms the
   transfer, and only that confirmation completes the payment.

## Data added

Additive only: new tables and columns, no changes to existing data.

### Migration `002_ubuild.sql`

| Table | Purpose |
| --- | --- |
| `professionals` | Professional information attached to an existing `users` account (a professional is a user, not a separate person record) |
| `engagements` | Agreed project + client + professional, scope, timeline and fee |
| `engagement_variations` | Proposed amendments to agreed terms, pending the client's decision |
| `professional_ratings` | Client ratings, only against a completed UBuild engagement |
| `payment_providers` | The project's payment arrangement (A or B) |
| `project_funds_accounts` | The client's project money account record |
| `payment_requests` | A professional's request for payment against an engagement |
| `payment_instructions` | Explicit client authorization or rejection |
| `financial_ledger` | Immutable money movements, pending until provider-confirmed |

### Migration `003_ubuild.sql`

Adds `allocated_cents` and `construction_stage` to `project_funds_accounts` so
the funds account can show planning earmarks without moving money.

### Migration `004_ubuild_integration.sql`

Adds shared context to existing records and creates the marketplace/supporting
tables:

| Change | Purpose |
| --- | --- |
| `projects.scope`, `budget_cents`, `currency`, `construction_stage` | The project brief is a first-class record shared by every workflow |
| `professionals.project_role` | Default project role when a professional is engaged |
| `engagements.construction_stage`, `opportunity_id`, `application_id`, `start_date`, `end_date` | Engagements are stage-scoped and traceable to the opportunity that produced them |
| `documents.engagement_id`, `documents.construction_stage` | Documents belong to the same project/engagement/stage records |
| `milestones.engagement_id`, `milestones.construction_stage` | Progress records follow the engaged work |
| `opportunities` | Client-published stage-scoped work with budget, location, deadline and status |
| `opportunity_applications` | Professional applications with proposed fee, message and availability |
| `funds_allocations` | Planning earmarks by stage (optionally by engagement); never money movement |
| `project_messages` | Project/engagement-scoped collaboration messages |

The migration runner applies each versioned file once and records it in
`schema_migrations`; `003` and `004` are safe to re-run on databases upgraded
before version tracking existed. SQLite (tests) and PostgreSQL keep parallel
migration pairs.

## Financial rules and where they are enforced

| Rule | Enforcement |
| --- | --- |
| No payment request without a valid UBuild engagement | `FinanceService.RequestPayment` requires an `APPROVED` engagement whose project and professional match the request |
| No request beyond agreed terms without an approved variation | Request total (submitted + authorized + paid) is capped at `engagements.fee_cents` plus `APPROVED` variations in `FinanceService.agreedTotal` |
| No release without explicit client authorization | `FinanceService.Authorize` is the only path that creates a `RELEASE` ledger entry, and it requires the caller to be the engagement client |
| No automatic or AI-triggered release | Nothing in `MarketplaceService`, `OpportunityService`, recommendations or `EngagementService.Complete` moves money; a completed engagement only checks already-confirmed releases |
| No self-approval | A client cannot engage themselves (`EngagementService.Create`), authorization requires the client account, and `Authorize` re-checks that the professional is not the authorizing account |
| No ratings from external engagements | `MarketplaceService.Rate` requires a `COMPLETED` engagement matching the client and project |
| No unauthorized financial access | Handler role checks: funds, ledger, provider, deposits, allocations and authorization are client-only; payment requests are visible to the client and the engaged professional only; `financials/me` returns only the caller's own records |
| Earmarks never move money | `FinanceService.AllocateFunds` writes only `funds_allocations`; active allocations are capped by the provider-confirmed balance and cannot change the ledger |
| Audit every approval, rejection, instruction and transaction | Every state change writes an `audit_entries` row inside the same transaction |
| Completion only on payment-provider confirmation | `payment_requests.status` becomes `PAID` and ledger entries become `POSTED` only in `FinanceService.ConfirmProviderTransaction` |

Ledger entries are created as `PENDING_CONFIRMATION`; the funds balance and the
`availableCents` figure only change when the provider confirms. A client
authorization is recorded as an instruction and never completes a payment.
`Reject` ends a request; `RequestRevisions` returns it to the professional, who
can resubmit only through the same engagement and agreed-terms cap.

## API

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/professionals` | Session | Professional directory (`q`, `discipline`, `stage`, `limit`) |
| GET | `/api/professionals/recommendations` | Session | Advisory ranking by stage and scope |
| GET | `/api/professionals/{professionalId}` | Session | One professional profile |
| PUT | `/api/professionals/me` | Session | Publish or update your professional profile |
| GET | `/api/professionals/me/applications` | Session | Your opportunity applications |
| GET | `/api/opportunities` | Session | Open opportunities (`stage`, `q`, `limit`) |
| GET | `/api/opportunities/{opportunityId}` | Session | Opportunity detail and its applications |
| POST | `/api/opportunities/{opportunityId}/applications` | Session | Apply to an open opportunity |
| GET/POST | `/api/projects/{projectId}/opportunities` | Project member / owner | List or publish project opportunities |
| POST | `/api/projects/{projectId}/opportunities/{opportunityId}/close` | Owner | Close an opportunity without awarding it |
| POST | `/api/projects/{projectId}/applications/{applicationId}/decide` | Owner | Shortlist or reject an application |
| POST | `/api/projects/{projectId}/applications/{applicationId}/select` | Owner | Select an applicant and propose an engagement |
| POST | `/api/projects/{projectId}/applications/{applicationId}/withdraw` | Applicant | Withdraw your own application |
| GET | `/api/projects/{projectId}/recommendations` | Owner/coordinator | Stage/scope ranking for this project |
| GET/POST | `/api/projects/{projectId}/engagements` | Project member / owner | List or propose engagements |
| POST | `/api/projects/{projectId}/engagements/{engagementId}/approve` | Owner | Approve agreed terms and create the professional membership |
| POST | `/api/projects/{projectId}/engagements/{engagementId}/complete` | Owner | Complete once all agreed money is provider-confirmed |
| GET/POST | `/api/projects/{projectId}/engagements/{engagementId}/variations` | Member / client or engaged professional | List or propose variations |
| POST | `/api/projects/{projectId}/variations/{variationId}/decide` | Owner | Approve or reject a variation |
| POST | `/api/projects/{projectId}/engagements/{engagementId}/ratings` | Owner | Rate a completed engagement |
| GET/POST | `/api/projects/{projectId}/funds` | Owner | Read or open the project funds account |
| POST | `/api/projects/{projectId}/deposits` | Owner | Record a deposit (pending provider confirmation) |
| POST | `/api/projects/{projectId}/funds/allocate` | Owner | Earmark funds by stage or engagement (never moves money) |
| GET | `/api/projects/{projectId}/allocations` | Owner | List funds allocations |
| POST | `/api/projects/{projectId}/allocations/{allocationId}/cancel` | Owner | Cancel an earmark without moving money |
| GET | `/api/projects/{projectId}/ledger` | Owner | Financial ledger |
| GET/POST | `/api/projects/{projectId}/payment-requests` | Owner / engaged professional | List or submit payment requests |
| POST | `/api/projects/{projectId}/payment-requests/{requestId}/authorize` | Owner | Explicit authorization (creates a pending release) |
| POST | `/api/projects/{projectId}/payment-requests/{requestId}/reject` | Owner | Rejection with a reason |
| POST | `/api/projects/{projectId}/payment-requests/{requestId}/revisions` | Owner | Request changes before authorizing |
| POST | `/api/projects/{projectId}/payment-requests/{requestId}/resubmit` | Engaged professional | Resubmit after requested changes |
| GET | `/api/projects/{projectId}/payment-requests/{requestId}/instructions` | Owner / engaged professional | Authorization and decision instructions |
| GET/PUT | `/api/projects/{projectId}/provider` | Owner | Read or configure the payment arrangement |
| GET/POST | `/api/projects/{projectId}/messages` | Active project member | Read or post project/engagement collaboration messages |
| GET | `/api/projects/{projectId}/financials/me` | Engaged professional | Your own engagements, requests and releases on this project |
| PATCH | `/api/projects/{projectId}` | Owner | Update the project brief and current stage |
| POST | `/api/provider/transactions` | Provider intake secret | Provider confirmation of a deposit or release |

UI: `/dashboard/opportunities` (marketplace and applications),
`/dashboard/professionals` (directory and profile), plus
`/dashboard/projects/{id}/opportunities`, `/engagements`, `/payments`, `/funds`,
`/messages` and `/financials`. The project overview shows the shared brief,
budget, currency and stage, and lets the owner edit them.

## Payment provider abstraction

Two arrangements are supported, both stored as configuration only:

- **A** — the client connects a bank or mobile money account they already hold;
  UBuild coordinates the request and approval.
- **B** — the client uses a dedicated project account operated by a bank or
  payment service provider.

The platform stores a provider name, an account label and the disclosure text. It
does not store bank credentials, does not hold funds and does not pretend to
escrow. No provider API has been invented: the only integration point is
`POST /api/provider/transactions`, which an adapter built during provider
selection calls after the provider has executed or failed a transfer. The call
is disabled unless `UBUILD_PROVIDER_SECRET` is set, and the caller must send it
as `X-UBuild-Provider-Secret`. Confirmations are idempotent: repeating a
successful confirmation does not move money twice.

`UBUILD_PROVIDER_SECRET` is the only new environment variable.

## Dependent on provider selection and regulatory review

The following are deliberately **not** implemented, because they depend on the
chosen provider and the regulatory position:

- provider API contracts (authorization, payout, refund, webhook signatures) and
  their capability limits;
- account linking/KYC for arrangement A and dedicated-account onboarding for
  arrangement B;
- provider fee schedules, settlement timing and reconciliation files;
- dispute, reversal and chargeback handling;
- interest, float, safeguarding or escrow treatment of project funds;
- data-protection review of account data sent to the provider;
- regulatory review of the coordination model in each operating market, and the
  licensing position of the provider(s) selected;
- production secrets, key rotation and provider sandbox certification.

Until those are settled the interface is complete and testable, and the
provider intake is an authenticated stub by design rather than a simulated
provider. UBuild does not claim to hold, safeguard or escrow funds.

## Checks

```bash
cd backend && go test ./... && go build ./cmd/api
cd frontend && npm run lint && npm run build
```
