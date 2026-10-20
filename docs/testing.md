# Testing

## Local checks

Run from the repository root after `npm ci`:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:ml
node --test tests/locale-translator.test.mjs tests/rental-flow.test.mjs
```

ML tests compare Node predictions with bundled Python-generated fixtures. A separate Python service is not required.

## Browser tests

```bash
npx playwright install chromium
npm run test:locale:browser
```

`playwright.config.mjs` targets `http://localhost:3000` and starts `npm run dev` if no server is running. The first test checks homepage language switching. The second requires the synthetic demo accounts and listing ID 13 referenced in `tests/locale.playwright.mjs`; it will not work unchanged against an empty database. Adapt the fixtures to your test project first. Credentials in tests are fixtures, not promised access to the public demo.

## HTTP integration tests

Use a separate test database and a server configured for that database. Tests may create accounts, listings, visits, applications, messages, documents, and simulated payment records. Do not use production data or personal identities.

| Command | Default target | Requirements |
| --- | --- | --- |
| `npm run test:integration` | `http://localhost:3001` | Four confirmed fixture accounts, or a test environment with email autoconfirm |
| `npm run test:endpoints` | `http://localhost:3000` | Account/data fixtures expected by the endpoint script |
| `npm run test:collaboration` | `http://localhost:3108` | Four synthetic demo accounts expected by the script |

`PROPORA_TEST_URL` overrides the HTTP target. PowerShell example for an existing server on port 3000:

```powershell
$env:PROPORA_TEST_URL = 'http://localhost:3000'
npm run test:integration
```

For the marketplace suite, set `PROPORA_TEST_ACCOUNTS` to a local JSON file containing an array of four objects with `prefix`, `email`, and `password` fields. Prefixes must be `owner`, `other-owner`, `seeker`, and `other-seeker`. Use confirmed accounts with the matching roles. Store credential fixtures under the ignored `.data/` directory. Other suites have their own fixtures and do not necessarily use this variable.

Read each script before running it. Check output under `.data/`, including `collaboration-test-created.json` and `endpoints-test-results.json`, for recorded fixture IDs. Clean up test data by those IDs afterward; automatic cleanup is not guaranteed across all suites.

## Historical reports

Dated reports describe the code, data, and environment at the time of the original assessment. Listing counts, fixture IDs, endpoints, warnings, and results may change. Functional tests do not establish complete database-policy security; also read the [security review](security-audit-2026-10-19.md).

Bug reports should include route, user role, reproduction steps, expected/actual behavior, and commit version. Remove session cookies, tokens, account details, and personal documents from screenshots and logs.
