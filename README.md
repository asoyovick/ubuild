# UBuild

**Build from anywhere in the world.**

UBuild is a construction technology platform that helps property owners and investors plan, coordinate, and monitor construction projects remotely — with an initial focus on Kenya and diaspora customers managing builds while abroad.

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
| `/` | Homepage (hero, services, project overview, technology, precision, process, trust) |
| `/services` | Service detail pages |
| `/how-it-works` | Project lifecycle |
| `/projects` | Public project showcase |
| `/about` | Company mission and approach |
| `/contact` | Project inquiry form (validated, server-side stored) |
| `/pricing` | Service packages and quote requests |
| `/login` / `/register` | Authentication |
| `/dashboard` | Authenticated workspace (overview, projects, milestones, reports, approvals, settings) |

## How it works (data & integrations)

### Local data store

For development, the app stores users, sessions, contact submissions, and newsletter signups in `data/*.json` (git-ignored). This makes forms, login, registration, and the dashboard fully functional without external services.

- Passwords are hashed with scrypt; sessions use httpOnly cookies.
- **Do not commit `data/`** — it is excluded by `.gitignore`.

### What still needs configuration

1. **Email delivery** — contact-form submissions are stored locally but not emailed. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_TO` in `.env.local` (see `.env.example`) and wire them into `app/api/contact/route.ts`.
2. **Production database** — replace `lib/store.ts` (the JSON layer) with your database client. All API routes read through this module.
3. **Dashboard data** — the dashboard currently renders clearly-labelled **sample data** from `lib/dashboard-data.ts`. Replace with real API calls per user session.
4. **Newsletter** — signups are stored locally; connect an email service to send campaigns.

### API routes

- `POST /api/contact` — validate + store a project inquiry
- `POST /api/newsletter` — validate + store an email signup
- `POST /api/auth/register` — create account, sets session cookie
- `POST /api/auth/login` — verify credentials, sets session cookie
- `POST /api/auth/logout` — clear session
- `GET /api/auth/me` — current session user

## Accessibility & quality

- Semantic HTML, labelled form fields, `aria-invalid`/`aria-describedby` on errors, keyboard-navigable navigation and mobile menu.
- Skip-to-content link, focus-visible outlines.
- Images use descriptive alt text and `object-cover`; hero image is prioritized.

## Deployment notes

- Set `NEXT_PUBLIC_SITE_URL` to your production domain.
- The local JSON store is for development/demo only — swap in a real database before public launch.
