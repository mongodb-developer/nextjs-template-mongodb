# Bookmarks with Next.js and MongoDB

Save useful links with a title and an optional note. Edit or delete them when you need to, and browse older bookmarks with cursor-based pagination.

Built with Next.js App Router, React, TypeScript and the MongoDB Node.js driver. The app has one bookmark list and no application sign-in. Restrict hosted access to the people who should be able to read and change it.

## Run locally

Make sure you have Git and Node.js 24 or later installed. Use a [supported LTS release](https://nodejs.org/en/about/previous-releases) with its latest patches. If you use nvm, `nvm install` and `nvm use` select the current LTS release from `.nvmrc`.

```bash
git clone https://github.com/Eronmmer/mongodb-bookmarks-tutorial.git
cd mongodb-bookmarks-tutorial
npm ci
cp .env.example .env
```

Configure [MongoDB Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/):

1. Create or select a cluster, then create a database user with `readWrite` access to `bookmark_app`.
2. Add the public outbound IP of your development machine to the project's IP access list.
3. Under **Connect → Drivers → Node.js**, copy the connection string. Replace the credential placeholders and select `bookmark_app` as the database. Percent-encode reserved characters in the username and password.
4. Set `MONGODB_URI` in `.env` to that connection string. Keep credentials out of Git and screenshots.

Create the pagination index, then start the app:

```bash
npm run db:setup
npm run dev -- --hostname 127.0.0.1
```

Open [localhost:3000](http://127.0.0.1:3000). Add a bookmark, refresh the page, edit its note and try deleting it.

`db:setup` creates the `{ createdAt: -1, _id: -1 }` index. Run it for each database before using the app. Running it again against the same database is safe. The database user must have permission to create indexes.

## Run the checks

Install the browser used by the tests:

```bash
npx playwright install --with-deps chromium
```

Then run:

```bash
npm run verify
npm run verify:dev
```

`verify` runs lint, TypeScript checks, unit tests, a production build and browser tests. `verify:dev` runs the browser tests against the development server. Both cover saving, editing and deleting bookmarks, pagination, validation and database error states.

The verification runner starts its own temporary MongoDB process and deletes its test data afterward. It does not use the Atlas URI in `.env`. Use these commands for the full suite rather than invoking `test:e2e` directly. The first run needs internet access to download MongoDB.

The runner supports macOS and Linux. Native Windows is not supported, and WSL has not been verified. GitHub Actions runs the production checks on Node.js 24 and 26.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Bookmark list, pagination and loading errors |
| `app/actions.ts` | Server Actions for creating, updating and deleting bookmarks |
| `components/bookmark-form.tsx` | New-bookmark form |
| `components/bookmark-item.tsx` | Bookmark card with edit and delete controls |
| `db/bookmarks.ts` | MongoDB queries and writes |
| `lib/mongodb.ts` | Shared database connection |
| `lib/bookmark-validation.ts` | Input validation |
| `scripts/setup-db.mjs` | Pagination index setup |
| `scripts/verify.mjs` | Isolated test runner |
| `tests/` | Browser and unit tests |

Each document stores a title, URL, optional note and creation/update timestamps. The server validates input and generates timestamps. The list shows 100 bookmarks per page, ordered by creation time and `_id`. Editing a bookmark preserves its original position.

## Deploy with restricted access

Import this repository into Vercel. Before adding working database credentials, enable Vercel Authentication for **All Deployments** under **Settings → Deployment Protection**. Check exceptions and bypass links too. The app has no user accounts, so everyone who passes the hosting access check can read and change the same list.

Add `MONGODB_URI` as a server-only Production environment variable. Use a separate database if you also enable Preview deployments. Run `npm run db:setup` against the target database from a trusted machine, then deploy. Redeploy after changing environment variables.

Atlas must allow connections from Vercel's outbound network. Follow [Vercel's Atlas networking guidance](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address). An Atlas `0.0.0.0/0` entry permits connection attempts from anywhere, so use strong credentials scoped to `bookmark_app`. Vercel's access gate protects the app, not direct database connections.

Before sharing a deployment, verify that signed-out visitors cannot read bookmarks or submit valid create, update or delete requests. Then check the CRUD flow with authorized access.

## Licence and source

Adapted from [MongoDB's Next.js template](https://github.com/mongodb-developer/nextjs-template-mongodb). The original Apache 2.0 licence is preserved in [LICENSE](LICENSE).
