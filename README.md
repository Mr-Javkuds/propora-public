# Propora AI

An academic commercial-property marketplace with machine-learning recommendations for business locations in Semarang, Indonesia. Propora connects property seekers and owners through search, visits, rental applications, messaging, and rental status tracking.

[Live demo](https://propora-ai.vercel.app) · [Source code](https://github.com/Mr-Javkuds/propora-public)

## Features

- Property search by location, budget, and amenities, with favorites and comparisons.
- Business-location recommendations using a bundled regression model.
- Owner dashboard for listings, viewing requests, rental applications, and messages.
- Private application-document uploads and rental status tracking.
- Simulated payment records without transferring money.
- Indonesian, English, and Chinese interface options (`id`, `en`, `zh`).

## Project status

This is an academic prototype. Location signals use reference/proxy datasets rather than live Maps or Trends data. Scores do not guarantee business success, and physical property conditions require independent verification. Some listings and images are sample data or illustrations.

Virtual-account, QRIS, and wallet payment options are simulations. Payment gateways, digital contract signing, SMS/WhatsApp integrations, and Google OAuth are not implemented.

The [security review](docs/security-audit-2026-10-19.md) records known issues affecting AI-score integrity, payment records, and document requirements. Publishing this snapshot does not resolve those issues. Evaluate it with synthetic data in an isolated environment before considering production use.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, next-intl, Leaflet, and Supabase Auth/Postgres/Storage. ML inference runs in Node.js using bundled JSON artifacts; running the web application does not require Python.

## Quick start

Use Node.js 24. The package also supports Node.js 22.13+ within major version 22. Create your own Supabase project; cloning this repository does not provide access to the demo database.

```bash
git clone https://github.com/Mr-Javkuds/propora-public.git
cd propora-public
npm ci
```

Copy `.env.example` to `.env.local` and configure your project:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
```

Follow the [setup guide](docs/setup.md) to apply database migrations and configure authentication, then run:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Register at `/login`, choose a seeker (`pencari`) or owner (`pemilik`) role, and confirm your email if required. A new database has no listings; create them through the owner interface.

For a local production build:

```bash
npm run build
npm start
```

Both npm and Bun lockfiles are included. Keep `bun.lock` synchronized when changing dependencies if deploying with Bun.

## Repository layout

| Path | Purpose |
| --- | --- |
| `app/` | Pages, components, API routes, and application logic |
| `app/lib/ml/` | Model inference and bundled artifacts |
| `i18n/`, `messages/` | Locale configuration and translation dictionaries |
| `supabase/migrations/` | Database schema, policies, Storage, and functions |
| `scripts/` | Local seed and data/model export utilities |
| `tests/` | Unit, HTTP integration, and browser tests |
| `public/` | Static assets |
| `docs/` | Guides and historical audit summaries |

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:ml
node --test tests/locale-translator.test.mjs tests/rental-flow.test.mjs
```

See the [testing guide](docs/testing.md) for fixture requirements and integration tests that create data.

## Documentation

- [Setup, deployment, and data utilities](docs/setup.md)
- [Testing and fixtures](docs/testing.md)
- [Typography](docs/typography.md)
- [Data and workflow audit summary](DATA-INTEGRITY-AUDIT.md)
- [Runtime data sources](docs/data-integrity-audit.md)
- [Endpoint test summary](ENDPOINT-TEST-REPORT.md)
- [Known security findings](docs/security-audit-2026-10-19.md)

## Contributing

Open an issue with reproduction steps, expected and actual results, and your environment. Use synthetic data and remove tokens, cookies, and personal documents from attachments. Include relevant verification results in pull requests.

## Provenance and licensing

This repository is a standalone source snapshot of the Propora project, prepared from commit `945e3e1` of the existing development repository. Earlier private Git history, browser profiles, local QA captures, generated reports, and environment files are excluded. The live demo remains connected to the existing development repository.

No project-wide LICENSE file has been supplied. Public visibility does not itself grant a license to reuse or redistribute the code. Third-party notices, including the bundled font license, remain applicable to their respective assets.
