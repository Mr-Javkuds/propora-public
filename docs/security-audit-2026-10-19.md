# Security review — October 19, 2026

This English summary preserves the findings of a historical review of original development commit `06b3eb4`. That commit is not part of this standalone repository history. Documentation changes and publication do not remediate these findings. No fresh security scan is claimed here.

The original review covered application code, local migrations, database policy/grant/function metadata, Supabase Security Advisors, and npm dependency audit results. Database inspection was read-only; no write exploit, account creation, email delivery, document upload, or load test was performed.

## P1: Owners can supply their own AI analysis

The `authenticated` role had INSERT/UPDATE/DELETE access to `listing_analyses`, with policies checking listing ownership. `public.save_listing` also accepted caller-provided `p_analysis`. A listing owner could bypass Next.js and supply scores, labels, signals, or model metadata directly through Data API/RPC. An input fingerprint is not proof of server-generated output.

Relevant sources: `supabase/migrations/20261015152127_supabase_auth_marketplace.sql`, `20261015152840_split_analysis_write_policies.sql`, and `app/lib/marketplace-store.ts`.

Impact includes manipulated recommendations and reports. Invalid JSON in a stored analysis could also disrupt recommendation loading if parsing failures are not isolated per listing.

Proposed remediation: restrict analysis writes to a trusted server path, remove user-controlled analysis inputs from privileged RPCs, and validate/isolate stored analysis parsing. Verify that direct REST/RPC modifications are rejected while normal server-generated analysis still works.

## P1: Seekers can insert fabricated payment receipts

Table-level INSERT grants on `applications` included the later-added `payment` column. The insertion policy checked identity, role, pending status, availability, and dates, but did not require `payment IS NULL`. A seeker could insert an application containing a self-supplied receipt. History treated non-null payment records as completed transactions, and the payment function returned an existing receipt before generating one or synchronizing rental status.

Relevant sources: `supabase/migrations/20261015152127_supabase_auth_marketplace.sql`, `20261016001030_synchronize_simulated_payments.sql`, `app/lib/rental-ledger.ts`, and `app/lib/rental-status.ts`.

Impact is forged payment history and inconsistent rental state. Payments are simulated; the finding does not demonstrate theft of funds or an external gateway bypass.

Proposed remediation: constrain insertable columns, require null payment on new applications, and permit only trusted payment processing to create receipts. Verify direct receipt insertion fails and normal payment remains idempotent with consistent listing status.

## P2: Required identity documents can be bypassed

The UI required an Indonesian identity document (KTP), but the server accepted an empty document array. `submit_application` checked for KTP only when at least one document was provided. Direct application INSERT was another bypass path.

Relevant sources: `app/pencari/booking/pengajuan-sewa/page.tsx`, `app/lib/marketplace-store.ts`, and `supabase/migrations/20261015155207_documents_owner_flow.sql`.

If KTP is mandatory, enforce it unconditionally in the server/database transaction and close direct insertion paths. Reject empty document arrays, tax-document-only submissions, and documents owned by another user. This finding does not establish that the application performs identity authenticity verification or KYC.

## Development dependency advisory

The historical npm audit reported a High advisory along the ESLint dependency chain through `fast-glob`, `micromatch`, and `braces`. Multiple package reports represented one underlying [GHSA-vfj7-8cjw-p6xm advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), not independent application vulnerabilities.

The production-only audit reported zero vulnerabilities at that time. No application HTTP path to this tooling issue was identified. These are historical results, not current dependency guarantees. Review compatible upstream fixes rather than blindly applying a forced major downgrade.

## Authentication configuration warning

The reviewed environment reported disabled leaked-password protection. Assess the setting and its availability for your own project using [Supabase password security documentation](https://supabase.com/docs/guides/auth/password-security). This warning is not evidence of account compromise.

## Evidence and limits

The original assessment recorded 11 passing local auth/rental-status/ledger tests and RLS enabled on nine application tables. Reviewed application paths used user verification, database role profiles, HttpOnly/SameSite session cookies, Origin checks, private document buckets, and short-lived signed download URLs.

RLS enablement does not prove that every policy is correct. Application endpoint validation does not protect a separate direct database write path. See [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

The original review did not run HTTP integration suites, browser testing, network penetration tests, reverse-proxy/CDN assessments, write exploit demonstrations, or load tests. It did not comprehensively scan private Git history. Local Map-based login rate limiting and request-size checks after body reading were additional hardening areas, with deployment exploitability not verified.

Priority: restrict AI-analysis and receipt writes, enforce required documents at trusted boundaries, then review tooling and password configuration. Validate fixes in an isolated test environment.
