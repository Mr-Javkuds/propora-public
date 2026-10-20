# Setup and deployment

## Your own Supabase project

1. Create a development Supabase project and copy its URL and publishable key into `.env.local`, using `.env.example` as a template.
2. On a new database, execute the SQL files in `supabase/migrations/` through the SQL Editor in ascending timestamp order. They define tables, functions, access policies, and Storage buckets. Review migrations before executing them; do not blindly replay them against an existing database.
3. Under Authentication > URL Configuration, set Site URL to `http://localhost:3000`. Allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/auth/reset`.
4. Enable email/password authentication and configure email confirmation as needed. Register through the application so that its role-profile workflow runs. Password recovery uses email and `/auth/reset`.
5. Create seeker and owner accounts, then add listings at `/owner/listing-baru`. The repository does not include the demo database.

See the official [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls). Configure the exact production origin when deploying and configure email delivery/SMTP as needed.

The application uses a publishable key and user sessions. Never place service-role or secret keys in `NEXT_PUBLIC_*` variables. Do not commit `.env.local`, database exports, session cookies, tokens, or personal documents.

Applying migrations does not establish production readiness. Review the [known security findings](security-audit-2026-10-19.md) before using real data.

## Vercel deployment

Import your repository into Vercel as a Next.js project. Set the root directory to the folder containing `package.json`, use Node.js 24, and build with `npm run build`. Set both variables from `.env.example` for the intended deployment environment before building.

Use separate development and production databases. Match Supabase Site URL and Auth redirects to the deployment domain. Local environment configuration is not uploaded by a Git push.

After deployment, check the homepage, login/email confirmation, password recovery, role restrictions, and property search. Run write-flow tests with synthetic data on staging: integration tests can create listings, applications, and documents.

The existing live demo is managed through the original development repository. Publishing this standalone repository does not reconnect or replace that deployment.

## SQLite seed and legacy export

The marketplace runtime uses Supabase. These commands only modify `.data/propora.sqlite` locally:

```bash
npm run db:seed
npm run db:reset
```

`db:reset` replaces local SQLite data and sessions. It does not reset or populate Supabase. Seed accounts and properties are synthetic fixtures; do not import shared demo credentials into a public service.

`scripts/export-supabase.mjs` is a legacy SQLite migration utility, not a required installation step. It reads SQLite and produces `.data/supabase-import.sql` and `.data/supabase-id-map.json`. Exports may contain account and business data. Review the SQL before importing into an empty test project and keep all exports outside Git. Real account passwords and old sessions are not migrated; affected accounts require recovery. Synthetic demo accounts receive special handling in the script.

## ML artifacts

`app/lib/ml/artifacts.json` is bundled and sufficient for runtime inference. Use `npm run ml:prepare` only when regenerating the bundle from research sources.

`scripts/export-ml.py` requires Python 3 and an `ML/` directory alongside this repository containing:

- `07_modeling/propora_linear_decision_support_model.json`
- `02_data_cleaning/propora_clean_property_dataset.csv`
- `04_feature_engineering/propora_business_recommendation_scenarios.csv`

Those research inputs are not included in the web repository. The model uses environmental reference/proxy features for Semarang rather than live environmental-data services.

## Languages

Locales are configured in `i18n/config.ts`, dictionaries in `messages/`, and page phrases in `i18n/`. Supported locales are `id`, `en`, and `zh`. Preferences use the `propora_locale` cookie without changing URLs. The booking calendar follows the active locale. When adding a language, update configuration, dictionaries, phrase mappings, and the language switcher together.
