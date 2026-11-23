# Working on Bookmarks

Use Node.js 24 or later from a currently supported LTS release, with its latest patches, and `npm ci`. `.nvmrc` follows the current LTS release. CI checks Node 24 and 26; a minimum engine version is not evidence that future releases have been tested. Read `README.md` and `EDD.md` before changing database behavior. The user selected a single-list app with no application sign-in or per-user ownership. Keep tutorial labels and engineering disclaimers out of the product interface. Hosted access restriction is a separate deployment requirement; do not claim production validation before the hosted checks have run.

## Commands

```bash
npm ci
npx playwright install --with-deps chromium
npm run verify
npm run verify:dev
```

`verify` covers lint, types, unit tests, a production build without a URI, isolated MongoDB CRUD and missing/unreachable database states. `verify:dev` exercises development CRUD. Use synthetic disposable data and these wrappers; never run destructive tests against a shared or personal database. Inspect `scripts/verify.mjs` and `playwright.config.ts` before invoking lower-level Playwright commands.

For manual development, copy `.env.example` to `.env`, set `MONGODB_URI` to your Atlas connection string selecting `bookmark_app`, then run `npm run db:setup` and `npm run dev -- --hostname 127.0.0.1`. Follow the database-user and network setup in `README.md`. Automated checks use their own disposable database and must not use the Atlas URI.

## Source map

- `app/page.tsx`: dynamic Node.js page and read/error states.
- `app/actions.ts`: validated Server Actions and mutation feedback.
- `components/bookmark-form.tsx`, `components/bookmark-item.tsx`: interactive UI.
- `db/bookmarks.ts`: typed database operations, fixed write fields and view conversion.
- `lib/mongodb.ts`: server-only lazy shared connection.
- `lib/bookmark-validation.ts`: untrusted input and identifier validation.
- `EDD.md`: MongoDB entity/document contract.

Keep connection strings, raw driver errors and credentials out of browser output, logs, fixtures and commits. Keep `MONGODB_URI` server-only; do not add a `NEXT_PUBLIC_` prefix. Preserve the distinction between an empty list and a failed database read. Validate on the server even when the browser also validates.

## MongoDB skills and model changes

Use the official MongoDB agent skills from <https://github.com/mongodb/agent-skills> whenever the task is MongoDB-specific and a matching skill exists.

Consult `EDD.md` before changing collections, document fields, queries, validation, form payloads or schema diagrams, and keep it aligned with the implementation. There is no collection-level JSON schema enforcement in this app.

Report commands actually run and their outcomes. Configuration is not execution evidence: do not claim CI, Codespaces, Atlas or Vercel validation without a recorded run. Do not create accounts, deploy or write a Google Doc without authorization.
