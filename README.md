# Flashpoint (Blueprint)

Know what is yours on day 0. Flashpoint helps a team that builds an app on shared platform tools find out which security requirements the platform already meets and which ones the team must meet.

The app targets the Singapore public-sector **IM8 Low-Risk Cloud** profile (118 requirements) and the **Generative AI** catalog (8 requirements). It is a hackathon project. It runs on your own computer and has no sign-in.

## The problem

Before a team can launch an app, it fills in a long security review sheet. Most of the answers say "the platform does this for us". Today the team must find that out by hand. Coding agents that compare a security plan to code give different answers each time.

## How it works

1. **Tell us about your app.** The builder answers a few risk questions. The app picks the requirements that apply.
2. **See the plan as a hotel.** A 3D cutaway of a hotel shows what the app needs. Each part of the building matches a group of requirements.
3. **Pick your tools.** The builder chooses the platform tools the app uses. Each tool covers some requirements, so the app marks those as done.
4. **Check off the rest.** Every requirement is *done* or *not done*. The builder ticks the ones that are theirs.
5. **Prompt your agent.** The builder gives a coding agent the security plan file (`BUILD-PLAN.md`) and a short prompt.
6. **Send it for review.** The builder downloads a pre-filled review spreadsheet (`.xlsx`) or an OSCAL JSON file.

## Three roles

A role switcher in the header stands in for sign-in.

| Role | Page | What they do |
| --- | --- | --- |
| App Builder | `/start`, `/projects` | Describe the app, pick tools, track requirements, export the plan. |
| Tool Owner | `/tool-owner` | Say which requirements a tool covers. Import official Component Guides. |
| Admin | `/admin` | Approve each new version of a tool's coverage. Manage the catalog. |

A tool version is never approved automatically. Every coverage claim has a source, a version, and a status: *Verified*, *Not yet verified*, or *Published by GovTech*.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- MongoDB 8 (runs in Docker)
- three.js for the hotel cutaway
- Zod for input checks, ExcelJS for the spreadsheet export
- Vitest for unit and integration tests, Playwright for end-to-end tests

Business logic is pure TypeScript in `lib/`. The client and the server share it.

## Get started

You need Node.js 20 or newer and Docker.

1. Install the packages:

   ```bash
   npm install
   ```

2. Start MongoDB:

   ```bash
   docker-compose up -d
   ```

   If you have the newer Docker, use `docker compose up -d`.

3. Load the seed data. This adds the IM8 catalog, sample tools, and a sample project:

   ```bash
   npm run seed
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open <http://127.0.0.1:3000>.

The app and MongoDB listen on `127.0.0.1` only.

### Settings

Both settings have defaults. To change them, copy `.env.example` to `.env.local`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `buildplan` | Database name |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Build and run a production copy |
| `npm run seed` | Load the seed data |
| `npm test` | Run unit tests |
| `npm run test:int` | Run integration tests (needs MongoDB) |
| `npm run e2e` | Run Playwright tests. They use port 3100 and the `buildplan_e2e` database. |
| `npm run lint` | Run ESLint |

## Project layout

| Folder | Contents |
| --- | --- |
| `app/` | Pages, server actions, and API routes |
| `lib/` | Domain logic: risk rules, plan building, catalog, import, export |
| `data/` | Seed data: catalog, component guides, plain-language wording |
| `scripts/` | Seed script |
| `test/`, `e2e/` | Unit, integration, and end-to-end tests |
| `docs/` | Build ledger, demo run-through, writing rules |
| `PRODUCT.md`, `DESIGN.md` | Product brief and design system |

## Design rules

- Screens for builders use plain words. They avoid terms such as "IM8", "SSP", "OSCAL", and "control" in the app's own text. Official wording appears only in detail panels and in exports.
- Product text says *should* and *comply*, not *must* or *obey*.
- The interface is for desktop screens.

## Limits

- No real sign-in. The role switcher is for demos.
- The coverage claims in the seed data are samples. Only the `appCentral` mapping was checked against its source. A security team has not reviewed the rest.
- "Uses a certified tool" does not prove that a requirement is met. Treat the plan as a starting point for review.
- The Component Guides for WebSG and Isomer come from GovTech's published spreadsheets.

## Licence

No licence is set yet. All rights are reserved until the owner adds one.
