![Next.js with MongoDB](./public/og.png)

-> View demo: [nextjs.mongodb.com](https://nextjs.mongodb.com/?utm_campaign=devrel&utm_source=github&utm_medium=referral&utm_content=template-nextjs-mongodb&utm_term=learning.fuel)

# Next.js with MongoDB

A minimal, production-ready template for building full-stack React applications with
[Next.js](https://nextjs.org/) (App Router), the [MongoDB](https://www.mongodb.com/) Node.js
driver, TypeScript, and Tailwind CSS / shadcn/ui. Use it as a starting point for full-stack
apps backed by MongoDB Atlas, with one-click deployment to Vercel.

## Features

- **Next.js 16 App Router** with React 19 and server components
- **MongoDB integration** via the official Node.js driver with a shared client singleton
- **Live connection status** badge on the home page (server-side `ping` health check)
- **TypeScript** throughout, with strict mode enabled
- **Tailwind CSS + shadcn/ui** components for styling
- **One-click Vercel deploy** with the MongoDB Atlas integration
- **End-to-end tests** (Playwright) and **CI** (GitHub Actions) against a real MongoDB

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5 |
| Database | MongoDB (Node.js driver `mongodb` v7) |
| Styling | Tailwind CSS 3, shadcn/ui, lucide-react |
| Testing | Playwright (end-to-end) |
| Hosting | Vercel |

## Architecture Overview

The home page (`app/page.tsx`) is a server component. On render it calls
`dbConnectionStatus()` (`db/connection-status.ts`), which uses the shared MongoDB client
from `lib/mongodb.ts` to run a `ping` command and report whether the database is reachable.
The result is shown as a status badge in the UI.

```mermaid
flowchart LR
    Browser["Browser"] --> Page["app/page.tsx (Server Component)"]
    Page --> Status["db/connection-status.ts<br/>dbConnectionStatus()"]
    Status --> Client["lib/mongodb.ts<br/>MongoClient singleton"]
    Client -->|ping| Atlas[("MongoDB Atlas")]
```

## Getting Started

Click the "Deploy" button to clone this repo, create a new Vercel project, setup the MongoDB integration, and provision a new MongoDB database:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?demo-description=Minimal%20template%20for%20building%20full-stack%20React%20applications%20using%20Next.js%2C%20Vercel%2C%20and%20MongoDB.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F4N50YqRe7FHsd0ysfGM8bC%2F1201fe6929b842ec3ee15ee036625471%2Fog.png&demo-title=MongoDB%20%26%20Next.js%20Starter%20Template%20&demo-url=https%3A%2F%2Fnextjs.mongodb.com%2F&products=%255B%257B%2522type%2522%253A%2522integration%2522%252C%2522protocol%2522%253A%2522storage%2522%252C%2522productSlug%2522%253A%2522atlas%2522%252C%2522integrationSlug%2522%253A%2522mongodbatlas%2522%257D%255D&project-name=MongoDB%20%26%20Next.js%20Starter%20Template%20&repository-name=mongo-db-and-next-js-starter-template&repository-url=https%3A%2F%2Fgithub.com%2Fmongodb-developer%2Fnextjs-template-mongodb&root-directories=List%20of%20directory%20paths%20for%20the%20directories%20to%20clone%20into%20projects&skippable-integrations=1)

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- A MongoDB connection string (from [MongoDB Atlas](https://www.mongodb.com/atlas/database) or a local MongoDB instance)

### Installation

Install the dependencies:

```bash
npm install
```

### Development

#### Create a .env file in the project root

```bash
cp .env.example .env
```

#### Get your database URL

Obtain the database connection string from the Cluster tab on the [MongoDB Atlas Dashboard](https://account.mongodb.com/account/login/?utm_campaign=devrel&utm_source=github&utm_medium=referral&utm_content=template-nextjs-mongodb&utm_term=learning.fuel).

#### Add the database URL to the .env file

Update the `.env` file with your database connection string:

```txt
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
```

#### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

Create a `.env` file from the example (`cp .env.example .env`) and set:

| Name | Required | Example | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | `mongodb+srv://user:pass@cluster0.example.mongodb.net/nextjs_template?retryWrites=true&w=majority` | MongoDB connection string used by the app and the end-to-end tests |

## Project Structure

- `app/` — Next.js App Router pages, layout, and global styles (`app/page.tsx` is the home page)
- `db/connection-status.ts` — server-side MongoDB connection health check
- `lib/mongodb.ts` — MongoDB client singleton (sets the `appName` connection metadata)
- `components/ui/` — shadcn/ui components
- `tests/e2e/` — Playwright end-to-end tests
- `.github/workflows/ci.yml` — CI pipeline (build + e2e against MongoDB)
- `AGENTS.md` / `EDD.md` — guidance for AI agents and the MongoDB data model

## Testing

End-to-end tests use [Playwright](https://playwright.dev/) and run against a real MongoDB
instance. They require `MONGODB_URI` to be set and the Playwright browser installed.

```bash
# one-time: install the browser
npx playwright install --with-deps chromium

# run the end-to-end suite (starts the app automatically)
MONGODB_URI="mongodb://localhost:27017/nextjs_template" npm run test:e2e
```

Expected result: the suite renders the home page and asserts the status badge shows
`Database connected`. The same suite runs in CI on every push and pull request via
[GitHub Actions](./.github/workflows/ci.yml), using a `mongo` service container.

## Troubleshooting

- **Badge shows "No MONGODB_URI environment variable"** — create `.env` (`cp .env.example .env`) and set `MONGODB_URI`, then restart the dev server.
- **Badge shows "Database not connected"** — verify the connection string, that your IP is allow-listed in Atlas Network Access, and that the database user and password are correct.
- **e2e tests fail to start the server** — ensure nothing else is using port 3000, or set `PORT` before running the tests.
- **Playwright "browser not found"** — run `npx playwright install --with-deps chromium`.

## Learn More

To learn more about MongoDB, check out the MongoDB documentation:

- [MongoDB Documentation](https://www.mongodb.com/docs/?utm_campaign=devrel&utm_source=github&utm_medium=referral&utm_content=template-nextjs-mongodb&utm_term=learning.fuel) - learn about MongoDB features and APIs
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/?utm_campaign=devrel&utm_source=github&utm_medium=referral&utm_content=template-nextjs-mongodb&utm_term=learning.fuel) - documentation for the official Node.js driver

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## Deploy on Vercel

Commit and push your code changes to your GitHub repository to automatically trigger a new deployment.
