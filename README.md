# UBuild

**Construction project coordination.**

UBuild helps property owners and project teams coordinate construction work, with an initial focus on projects in Kenya.

This repository is the UBuild frontend: a Next.js (App Router) application with TypeScript, Tailwind CSS, and Lucide icons.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
```

## Design system

- **Palette:** deep navy `#062A59`, primary blue `#0878D1`, light blue `#A9E6F5`, accent yellow `#FFD323`, pale blue-grey `#EDF6FA`, ink `#09294F`
- **Display type:** Bebas Neue (condensed, uppercase headings)
- **Body type:** Inter
- **Imagery:** local construction photography in `public/images/`
- Tokens are defined in `app/globals.css` under `@theme`

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Homepage (services and project process) |
| `/services` | Service detail pages |
| `/how-it-works` | Project lifecycle |
| `/projects` | Construction project types supported |
| `/about` | Company mission and approach |
| `/contact` | Project inquiry form (validated, server-side stored) |
| `/pricing` | Service packages and quote requests |
| `/login` / `/register` | Authentication |
| `/dashboard` | Authenticated workspace and project list |

## How it works (data & integrations)

### Local data store

The current data adapter stores users, sessions, project inquiries, newsletter signups, projects, memberships, invitations, and audit entries in `data/*.json` (git-ignored). This is suitable for local development only; it is not a production database.

- Passwords are hashed with scrypt; sessions use httpOnly cookies.
- **Do not commit `data/`** — it is excluded by `.gitignore`.

### What still needs configuration

1. **Email delivery** — contact-form submissions are stored locally but not emailed. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_TO` in `.env.local` (see `.env.example`) and wire them into `app/api/contact/route.ts`.
2. **Production database** — replace `lib/store.ts` (the JSON layer) with your database client. All API routes read through this module.
3. **Project workflows** — project creation, membership, invitations, and activity are stored. Budget, milestone, report, approval, and document records are not implemented yet and are not shown as populated data.
4. **Newsletter and password recovery email** — signups are stored locally; connect an email service before sending campaigns or password-reset links. Password reset requests currently report that email recovery is unavailable.

### API routes

- `POST /api/contact` — validate + store a project inquiry
- `POST /api/newsletter` — validate + store an email signup
- `POST /api/auth/register` — create account, sets session cookie
- `POST /api/auth/login` — verify credentials, sets session cookie
- `POST /api/auth/logout` — clear session
- `GET /api/auth/me` — current session user
- `POST /api/projects` — create a project and assign its creator as owner

## Accessibility & quality

- Semantic HTML, labelled form fields, `aria-invalid`/`aria-describedby` on errors, keyboard-navigable navigation and mobile menu.
- Skip-to-content link, focus-visible outlines.
- Images use descriptive alt text and `object-cover`; hero image is prioritized.

## Deployment notes

- Set `NEXT_PUBLIC_SITE_URL` to your production domain.
- The local JSON store is for development only — replace it with a real database before public launch.
