# Plan: the Accountable MVP

This plan builds what `docs/spec.md` describes, for the intent in `docs/intent.md`, on the stack in `docs/TECH_STACK.md`. Requirement IDs (RULE-3, PIPE-9 and so on) are the spec's. Each phase lists the IDs it delivers, and Proof lists the tests that prove them.

Each phase ends with every test written so far passing, and with `docs/STATUS.md` updated. A phase doesn't start while the one before it has a failing test. The end of each phase is a good point for the student to commit; the build session doesn't commit.

## Files that change

Everything is new apart from `.gitignore` and `docs/STATUS.md`. `README.md`, `docs/intent.md`, `docs/spec.md` and `docs/mockups/` stay as they are. If a phase finds the spec wrong or unclear, the spec is fixed first, then the code.

### Repo root

| Path | What it holds |
| --- | --- |
| `package.json` | npm workspace `frontend`. Scripts: `postinstall` (runs `uv sync`), `dev`, `seed`, `test`, `test:types`, `test:backend`, `test:frontend`, `test:e2e`, `api:types`. Dev packages: concurrently, open, tree-kill, @playwright/test, @axe-core/playwright, openapi-typescript. APP-5 to APP-8, APP-14 |
| `package-lock.json` | Written by npm |
| `pyproject.toml` | Python 3.12. Packages: fastapi, uvicorn, sqlalchemy, alembic, pydantic, email-validator. Dev group: pytest, httpx. Build backend `uv_build` with `backend` as the module root, so `accountable` can be imported from anywhere after `uv sync`. pytest settings (tests in `backend/tests`) |
| `uv.lock`, `.python-version` | Written by uv; `.python-version` says 3.12 |
| `playwright.config.ts` | Tests in `e2e/`, installed Google Chrome (`channel: chrome`), one worker, global setup and teardown, two projects: `app`, then `perf` |
| `scripts/dev.mjs` | Checks that ports 8000 and 5173 are free and, if one isn't, says so in Korean ("포트 8000을 다른 프로그램이 쓰고 있어요. 그 프로그램을 닫고 다시 실행해 주세요.") and stops. `ACCOUNTABLE_API_PORT` and `ACCOUNTABLE_WEB_PORT` move the ports. Then starts both servers with concurrently, waits for `/api/health` and the frontend, prints the address and opens it with `open`. Ctrl+C stops both. APP-5 |
| `scripts/api-types.mjs` | Writes the backend's OpenAPI schema to `frontend/src/api/openapi.json` and turns it into `frontend/src/api/schema.d.ts` with openapi-typescript. API-9 |
| `.gitignore` | Adds `backend/data/`, `e2e/.data/` and `e2e/.run/` |

`npm test` runs, in order: the frontend type check, pytest, Vitest, then Playwright. It stops at the first failure and exits with an error.

### How the code is laid out

The intent says Accountable will grow from a sales CRM into a business OS with ERP. Products, quotes, invoices, bills, accounting, sign-in and a move to Supabase are all likely next. The layout is meant to take those without moving what's already there, using folders and a few rules rather than abstractions. The backend and the frontend follow the same four rules:

1. **The top level holds only the ways in.** In the backend that's `main.py`, `seed.py` and `openapi.py`. In the frontend it's `main.tsx` and `app/`, the frame around every page.
2. **Shared code holds what every area needs and no business rules.** In the backend that's `core/`. In the frontend it's `api/`, `styles/`, `lib/` and `ui/`. Nothing in them knows about deals or stages, so a later area can use them as they are.
3. **Each business area is one folder** with its own tables, routes, sample data and screens. The MVP has one area, `crm`. A later area, such as `invoicing` or `accounting`, is a sibling folder.
4. **Inside an area, one folder per feature** (APP-13). Imports between features go one way, so there are no cycles:
   - `activities` uses no other feature;
   - `contacts` may use `activities`;
   - `deals` may use `contacts` and `activities`;
   - `pipeline` and `dashboard` may use `deals`;
   - `organizations` uses no other feature.

   Every feature may use its area's shared files and the shared code.

Adding an area later touches its own folders, plus one line each in:

- the backend's `main.py`, `seed.py` and `migrations/env.py`, along with a new migration;
- the frontend's router and top bar.

Nothing in `crm` changes.

### Backend: `backend/accountable/`

| Path | What it holds |
| --- | --- |
| `main.py` | Builds the FastAPI app, mounts each area's router under `/api` and answers `/api/health`. On start it brings the database up to date, and loads the sample data if the database file didn't exist before this start. APP-2, API-8 |
| `seed.py` | The `npm run seed` command. It asks first, unless given `--yes`. It wipes every table in one transaction and loads each area's sample data. APP-6 |
| `openapi.py` | Prints the app's OpenAPI schema, for `npm run api:types`. API-9 |
| `core/settings.py` | The database location: `ACCOUNTABLE_DB`, default `backend/data/accountable.db` |
| `core/clock.py` | `today()` and `now()`, the only place the backend reads the date. `ACCOUNTABLE_TODAY` fixes the date for tests; `now()` then uses that date with the current time of day. APP-11 |
| `core/db.py` | The single set of table definitions (`MetaData`) that every area's tables join, and the engine. SQLite's settings: foreign keys on, and a busy timeout so a seed run and the app don't fail on each other. A UTC timestamp column type that always gives back time-zone-aware values. A connection with one transaction per request. Running the migrations. Everything specific to SQLite is in this file, so moving to Supabase's Postgres later changes it and the migrations, and not the features. DATA-1, DATA-2 |
| `migrations/`, `backend/alembic.ini` | One Alembic history for the whole app. `env.py` imports each area's tables. `0001_crm` creates the four CRM tables and their indexes. Nothing uses `create_all` |
| `crm/router.py` | Gathers the CRM features' routes, so `main.py` mounts one router per area |
| `crm/tables.py` | The four CRM tables in SQLAlchemy Core: columns, checks (DATA-7, stage and status values), foreign key actions (set empty on organization or contact delete, delete activities with their record), and the indexes in PERF-4. They're linked to each other by foreign keys, so they live in one file. DATA-3 to DATA-7 |
| `crm/stages.py` | Stages, their Korean names, usual probabilities and which are open; contact statuses; activity kinds. DATA-8 |
| `crm/meta.py` | `GET /api/meta`. Small enough to be one file. API-1 |
| `crm/sample.py` | Loads the CRM sample data with dates set from today and a fixed random seed for activities. SEED-1, SEED-5 |
| `crm/sample_data.py` | The exporter's story, written out: organizations, contacts and deals, and the templates for activities. SEED-2 to SEED-4 |
| `crm/bulk.py` | About 1,000 of each record, for the speed tests only. Run as `uv run python -m accountable.crm.bulk`. SEED-6 |

The CRM features. Each folder has `routes.py` (the endpoints), `repo.py` (its data access, in SQLAlchemy Core), `schemas.py` (Pydantic shapes and field rules) and, where it has rules, `rules.py` (plain functions).

| Path | What it holds |
| --- | --- |
| `crm/activities/` | API-5, and both timeline endpoints (`/api/contacts/{id}/timeline`, `/api/deals/{id}/timeline`), since a timeline is a list of activities. `rules.py`: follow-up state, fixed automatic entries, and the one function that writes an automatic entry. DATA-6, DATA-7, RULE-9 to RULE-11 |
| `crm/organizations/` | API-2. Adds `https://` to a website with no scheme. DATA-3 |
| `crm/contacts/` | API-3 apart from the timeline. A status changed by hand, or by a won deal, goes through one function here that adds the `status_change` entry. DATA-4, RULE-8 |
| `crm/deals/` | API-4 apart from `/move` and the timeline. `rules.py`: expected revenue, open, late, and the stage change done as one transaction (probability, close date, furthest open stage, timeline entry, won makes a customer). DATA-5, RULE-1 to RULE-7 |
| `crm/pipeline/` | `GET /api/pipeline` and `POST /api/deals/{id}/move`. `positions.py`: a card's number between its neighbors, and renumbering a column. RULE-14, PIPE-6 |
| `crm/dashboard/` | `GET /api/dashboard`. `rules.py`: won and lost by month, the funnel, the follow-up list. RULE-12, RULE-13 |

Backend tests are in `backend/tests/`, in `core/` and `crm/` folders that mirror the code, and are listed under Proof. `conftest.py` at the top gives each test its own database file in a temp folder, fixes today at 2026-11-23, and stops the run if a test would open `backend/data/accountable.db`.

### Frontend: `frontend/`

| Path | What it holds |
| --- | --- |
| `package.json` | react, react-dom, react-router, @tanstack/react-query, @tanstack/react-table, recharts, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, react-aria-components, react-hook-form, zod, @hookform/resolvers, lucide-react, date-fns, @fontsource/noto-sans-kr, openapi-fetch. Dev: vite, @vitejs/plugin-react, typescript, vitest, jsdom, Testing Library (react, user-event, jest-dom) |
| `vite.config.ts` | Host `127.0.0.1`. The port comes from `ACCOUNTABLE_WEB_PORT` (5173 by default, 5273 in tests), with `strictPort` so a taken port fails instead of moving. `/api` is passed on to the backend at `ACCOUNTABLE_API_PORT` (8000 by default, 8100 in tests). Vitest settings: jsdom, a setup file |
| `tsconfig.json`, `index.html` | Strict TypeScript. `<html lang="ko">`. KO-9 |
| `src/main.tsx` | Loads the four font weights and the global styles. Providers: TanStack Query, React Aria's `I18nProvider locale="ko-KR"`, the router |
| `src/app/` | `router.tsx` (the eight pages), `Layout.tsx` with the top bar (UI-1, 6.1) and its "영업 기회 추가" button, `ConnectionBanner.tsx` (UI-5), `Toasts.tsx` with a polite live region (UI-4, A11Y-5). The only place that lists the sections |
| `src/api/` | `client.ts` (openapi-fetch with the generated types, and one error shape), `openapi.json` and `schema.d.ts` (generated, API-9) |
| `src/styles/` | `tokens.css`: brand colors, ink shades, stage colors and lane tints (LOOK-3 to LOOK-5, 6.1). `global.css`: the font, `tabular-nums`, the focus ring (LOOK-2, LOOK-9) |
| `src/lib/` | Plain functions. `dates.ts` (KO-2, KO-3), `money.ts` (KO-4, and reading typed amounts for FORM-5), `korean.ts` (counter words and particles, KO-5, KO-6), `ime.ts` (telling when a Korean letter is still being typed, for TBL-2 and FORM-7) |
| `src/ui/` | Shared components, each with its own `.module.css`: Panel, PageHeader (UI-2), Dialog (FORM-1), Field, Combobox (FORM-3), DatePicker (FORM-6), MoneyField (FORM-5), Badge, EmptyState (UI-6), Skeleton (UI-5), RecordLink (UI-7), RowMenu, SearchBox, ConfirmDelete (DEL-1; each feature gives it its own message), ChartPanel with "표로 보기" (A11Y-6). `DataTable/` holds the table and the search and Korean sort that only it uses (TBL-1 to TBL-6) |
| `src/crm/meta.ts`, `src/crm/badges.tsx` | The `/api/meta` query, and each stage's color token. The stage, status and late badges, built on `ui/Badge` (LOOK-5, A11Y-2) |
| `src/crm/organizations/` | OrganizationsPage, OrganizationPage, OrganizationForm, `api.ts` (its queries and saves), its delete message |
| `src/crm/contacts/` | ContactsPage (status filter), ContactPage, ContactForm, `api.ts`, its delete message |
| `src/crm/deals/` | DealsPage ("지연된 것만"), DealPage (stage selector), DealForm (FORM-4), `api.ts`, its delete message |
| `src/crm/activities/` | Timeline, ActivityForm, ActivityEditDialog, `api.ts` |
| `src/crm/pipeline/` | PipelinePage, Board, Lane, DealCard, CardMenu, ShareBand, `announcements.ts` (Korean drag messages, PIPE-9), `applyMove.ts` (moves the card and works out the totals at once, PIPE-8) |
| `src/crm/dashboard/` | DashboardPage, Figures, PipelineBand, WonRevenueChart, WonLostChart, Funnel, FollowUps, RecentActivity |
| `src/**/*.test.ts(x)`, `src/test/setup.ts` | Vitest, each test beside the module it tests |

The frontend never reads the computer's date for business logic. It takes today from `GET /api/meta`.

### End-to-end tests: `e2e/`

| Path | What it holds |
| --- | --- |
| `support/servers.ts` | Starts the backend and the frontend on ports 8100 and 5273, through `ACCOUNTABLE_API_PORT` and `ACCOUNTABLE_WEB_PORT`, with `ACCOUNTABLE_DB=e2e/.data/accountable-test.db`. Waits for `/api/health`. `restartBackend()` stops and starts the backend. Processes are stopped with tree-kill, so nothing is left running on Windows. Process IDs are kept in `e2e/.run/` |
| `global-setup.ts`, `global-teardown.ts` | A fresh test database loaded with the sample data; the servers started and stopped |
| `support/fixtures.ts` | Fails a test on any console error or warning, any page error, or any request to a host other than `127.0.0.1` (APP-4, APP-12). `resetData()` runs `npm run seed -- --yes` against the test database. An axe helper |
| `crm/*.spec.ts` | The CRM screens' tests |
| `*.spec.ts`, `perf/*.spec.ts` | Whole-app tests and speed tests. All are listed under Proof |

### Docs

| Path | Change |
| --- | --- |
| `docs/STATUS.md` | How to install, start, reset and test (APP-9), what each phase finished, and the board measurement from phase 5 |
| `docs/plan.md` | This file |

### Decided against

- **An ORM.** The spec asks for SQLAlchemy Core.
- **A service layer between routes and data access.** Rules are plain functions in their feature. Routes call them and the repo.
- **Generic code shared by every feature**, such as a CRUD base class, repository interfaces or a dependency-injection container. Each feature writes its own few queries. A little repetition across three tables costs less than an abstraction they don't need.
- **A plugin system that finds areas by itself.** Adding an area is a handful of plain lines (see "How the code is laid out").
- **More layers**, such as domain, application and infrastructure folders inside each feature. A feature is four files.
- **Tables in each feature's folder.** The four CRM tables point at each other, so they sit together in `crm/tables.py`. Each later area gets its own `tables.py` on the same `MetaData`.
- **Each area as its own Python package or npm workspace.** Folders are enough until an area needs to ship on its own.
- **Searching, sorting and paging on the server.** TBL-1 says the browser does it, and 1,000 rows is small.
- **A state library such as Redux.** Server data lives in TanStack Query, table state in the page address, and form state in React Hook Form.
- **Recharts for the funnel and the pipeline band.** Both need a minimum width per segment and the mockup's shapes, which Recharts' Funnel can't do. They're plain SVG and HTML. The line and bar charts use Recharts.
- **Playwright's `webServer` setting.** One test must stop and start the backend, so the tests manage the servers themselves.
- **Test-only API endpoints for resetting data.** Tests reset with the same seed command a user runs.
- **A production build or `npm start`.** The MVP runs with `npm run dev`. The end-to-end tests run against the Vite dev server too, so React's warnings show up in the console check.
- **Virtualizing the tables.** They show 50 rows a page.
- **Virtualizing the board.** Only if the phase 5 measurement shows it's needed.

## Order of work

### Phase 1: The app starts

1. Root `package.json`, `pyproject.toml`, `.python-version` and the frontend's `package.json`. `npm install` installs the Node packages and runs `uv sync`.
2. Backend shell: `core/` (settings, clock, database), `crm/tables.py`, `crm/stages.py`, the first migration, migrations on start, `/api/health` and `/api/meta`.
3. Frontend shell: the Vite config with the proxy, the fonts, the color tokens and global styles, the top bar from mockup 3, the eight routes as empty titled pages, the connection banner and the message area.
4. `scripts/dev.mjs`: port check, start both, wait, print the address, open the browser.
5. `npm run api:types`, and the test that the committed schema matches the backend.
6. The test setup: pytest's `conftest.py`, Vitest's setup, the Playwright config, server control and fixtures, and one smoke test.
7. `docs/STATUS.md`: how to install, start and test.

Done when `npm install` then `npm run dev` opens the empty dashboard at `http://127.0.0.1:5173`, a taken port prints the Korean message and stops, and `npm test` passes.

Delivers APP-1 (the frame), APP-2, APP-3, APP-4, APP-5, APP-7, APP-8, APP-9, APP-11, APP-12 (the console check), APP-13, APP-14, DATA-1 to DATA-8, API-1, API-8, API-9, UI-1, UI-5, LOOK-1, LOOK-2, LOOK-3, LOOK-9, KO-9.

### Phase 2: Rules and sample data

1. Deal rules (RULE-1 to RULE-7):
   - Expected revenue rounds half up: value × probability, plus 50, divided by 100 and rounded down. Python's own rounding goes to the even number and would give $0 for $1 at 50%.
   - A stage change sets the usual probability unless the same save sets one by hand.
   - Moving to Won or Lost sets today's close date unless the same save sets one. A deal created straight into Won or Lost with no close date also gets today.
   - `furthest_open_stage` only moves forward.
   - A stage change adds a `stage_change` entry with the old and new stage. The frontend writes the words ("단계 변경: 제안 → 협상") from the glossary.
   - Won makes the main contact a customer, with a `status_change` entry whose description keeps the deal's name at that moment, for "(‘2027 포장재 공급’ 수주)".
   - A deal whose stage changes, by any route, goes to the top of its new column.
2. Contacts: a status changed by hand adds a `status_change` entry with no deal name; nothing lowers a status automatically (RULE-8).
3. Activities (RULE-9 to RULE-11):
   - Exactly one of contact and deal is set.
   - Follow-up state is overdue, due today or upcoming.
   - Automatic entries can't be edited or deleted.
   - Timelines are newest first, 50 at a time. A contact's timeline includes the activities of the deals where they're the main contact now, each with the deal's name.
4. Positions (PIPE-6):
   - A new column starts at 1024 and steps by 1024.
   - A dropped card gets the number halfway between its neighbors.
   - The top of a column is the smallest number minus 1024.
   - When the gap between two neighbors falls below 0.001, the column is renumbered in 1024 steps, keeping its order.
5. Board columns (RULE-14), won and lost by month (RULE-12) and the funnel (RULE-13), as plain functions.
6. Sample data (SEED-1 to SEED-5):
   - The exporter's story, written out in `crm/sample_data.py`. Activities come from templates with a fixed random seed, so the data is the same every time apart from its dates.
   - Dates are set from today:
     - one won deal closes today, so "this month" is never empty, even on the 1st;
     - at least two won and one lost in the last 30 days;
     - three or four late deals;
     - three or four overdue follow-ups, one due today and five or six in the next two weeks.
   - Stage entries follow each deal's path, so they agree with its `furthest_open_stage`. Every customer has a status entry.
   - No timestamp is in the future.
7. Loading on first start, the `npm run seed` command with its question, and the bulk helper (SEED-6).

Done when the rule tests pass, a first start loads the sample, `npm run seed` asks first, and `npm run seed -- --yes` resets without asking.

Delivers RULE-1 to RULE-14, PIPE-6 (backend), SEED-1 to SEED-6, APP-6, APP-10 (kept after a restart).

### Phase 3: The JSON API

1. Request and response shapes with the field rules from section 2 of the spec:
   - text is trimmed, and lengths are checked;
   - email addresses must be valid;
   - a website gets `https://` if it has no scheme;
   - value must be 0 to 1,000,000,000 and probability 0 to 100;
   - a closed deal must have a close date;
   - an activity can't have happened in the future.

   A wrong field returns 422 with the field's name. A missing record returns 404.
2. Organizations, contacts, deals and activities endpoints (API-2 to API-5).
   - Lists carry what the tables show: an organization's contact count and open pipeline; a deal's organization and contact names, `expected_revenue` and `is_late`.
3. `delete-impact` counts and deletes, using the foreign key actions (DEL-2).
4. 409 for editing or deleting an automatic entry.
5. `GET /api/pipeline` and `POST /api/deals/{id}/move` with `{stage, after_id, before_id}`. `after_id` is the card above the drop and `before_id` the card below; either may be empty. The response is the saved card with its new number (API-6).
6. `GET /api/dashboard`, one call with everything in 4.2 (API-7, DASH-1):
   - today;
   - the four figures, including last month's won revenue for the comparison;
   - the band: count, value and expected revenue for each open stage;
   - 12 months of won revenue, won count and lost count, with months that have none at zero;
   - the funnel: value, count and share of New for five stages, plus the conversion rate;
   - follow-ups: overdue, due today, the next 14 days, and how many fall later;
   - the 10 newest timeline entries with the record each is on;
   - the counts for the header summary.
7. Regenerate the frontend types. Time the dashboard and pipeline calls with the bulk data (PERF-4).

Done when every endpoint has its pytest tests and they pass.

Delivers API-2 to API-7, DEL-2 (counts), DASH-1, PERF-4, and the field rules in DATA-3 to DATA-6.

### Phase 4: Tables and forms

1. The API client and each feature's queries.
   - After any save, the record, its lists, the pipeline and the dashboard are fetched again.
2. Formatting and text helpers.
   - Amounts use the narrow dollar sign, because `ko-KR` currency formatting otherwise writes "US$12,500".
   - A `YYYY-MM-DD` date is read as a local date, not as UTC midnight.
3. The shared UI pieces listed under Files.
4. The three table pages with the columns, search fields and default sorts in TBL-5.
   - Contacts have the status filter with counts.
   - Deals have the "지연된 것만" switch, which the address `?late=1` turns on.
5. The add and edit forms, as dialogs with React Hook Form and Zod.
   - The deal form fills in the organization from the contact, the probability from the stage, and today's close date for Won or Lost.
   - Plus the money field, the Korean date picker, the comboboxes, and no submit while a Korean letter is still being typed.
6. The delete dialog with the impact text for each kind.
7. "영업 기회 추가" in the top bar opens the deal form on any page.
8. Record pages as plain pages with the name, so every row and link leads somewhere until phase 6.

Done when all three tables can add, search, sort, page, edit and delete, by mouse and by keyboard, and the changes survive a refresh.

Delivers TBL-1 to TBL-8, FORM-1 to FORM-7, DEL-1, DEL-2, UI-2, UI-3, UI-4, UI-6, UI-7, KO-1 to KO-8, LOOK-4, LOOK-5, LOOK-6, LOOK-10, A11Y-2, A11Y-3, A11Y-4, A11Y-5.

### Phase 5: The pipeline board

This is the riskiest phase, so it starts with a measurement.

1. Load the bulk data into a scratch database, draw six lanes of plain cards with dnd-kit, and drag cards with about 170 in a lane. Write down in `docs/STATUS.md` how smooth it was. If frames drop, show only the visible part of each lane with @tanstack/react-virtual, and draw the dragged card in a drag overlay so it stays on screen while its lane scrolls.
2. The board from mockup 3:
   - the share band under the header;
   - lane heads with the count, total, expected revenue (or "최근 30일") and share bar;
   - "추가" at the top of each lane;
   - white cards, and the "지연 N일" chip on late ones (PIPE-1, PIPE-2, PIPE-4).
3. Drag and drop with the mouse (PIPE-3, PIPE-8).
   - A card can move to another lane or within its own, and can be dropped anywhere.
   - The frontend sends the new stage and the cards on each side.
   - The card and every total change at once.
   - If the save fails, the card goes back and "이동하지 못했어요. 다시 시도해 주세요." shows.
4. The keyboard (PIPE-9).
   - Space picks a card up, the arrow keys move it between lanes and up and down, Space drops it and Escape puts it back.
   - Each step is announced in Korean.
   - Only Space starts a drag, because Enter opens the deal (PIPE-5).
   - Each card has a menu with 단계 이동, 위로, 아래로, 수정 and 삭제.
5. At 1280px the six lanes fit. Narrower, the board scrolls sideways inside its panel (PIPE-7).

Done when a card moves by mouse, by keyboard and by its menu, stays where it was dropped after a refresh, and the totals change at once.

Delivers PIPE-1 to PIPE-9, RULE-14 on screen, and the first PERF-3 measurement.

### Phase 6: Record pages and timelines

1. The organization, contact and deal pages (REC-1 to REC-3). The deal page's stage selector moves the deal under RULE-3.
2. The timeline (REC-4):
   - each entry has an icon and a label for its kind, and the Korean date and time;
   - entries on a contact's timeline name the deal they came from;
   - 50 entries show, with "더 보기" for the rest.
3. Logging a note, call or email with an optional follow-up. Editing and deleting them, and the done checkbox. Automatic entries show no edit or delete (REC-5, REC-6, RULE-11).
4. Deleting from a record's own page goes back to its table (DEL-3).

Done when each record page shows its linked records and its timeline, and logging, editing, finishing and deleting an activity all work and survive a refresh.

Delivers REC-1 to REC-6, DEL-3, RULE-9 and RULE-11 on screen.

### Phase 7: The dashboard

1. The grid from mockup 3, in its order: the top panel with four figures and the band, then the line chart beside the bar chart, then the funnel beside the follow-ups, then recent activity in two columns.
2. The header with today's date from `/api/meta` and the summary (DASH-2).
3. The four figures (DASH-3 to DASH-6) and the band (DASH-9).
   - The band's blocks link to the pipeline.
   - A small stage keeps a minimum width.
4. The line chart with a flat light Sea Green area (DASH-7, LOOK-7), and the bar chart with counts on the bars (DASH-8).
5. The funnel as trapezoids with a minimum width (DASH-10).
6. Follow-ups with the done checkbox (DASH-12), and recent activity (DASH-13).
7. Each chart's text summary and "표로 보기" table (DASH-11, A11Y-6).
8. The dashboard fetches fresh figures every time it's shown.

Done when every panel shows figures that match the data, and a deal marked won or a new follow-up shows up on the next visit.

Delivers DASH-1 to DASH-13, A11Y-6, LOOK-7, LOOK-8, KO-3.

### Phase 8: Whole-app proof

1. Finish the end-to-end tests so each of the intent's success criteria is walked through as a user would.
2. axe on every screen, with and without each dialog open.
3. The `perf` project against the bulk data.
4. Check each screen by eye against the mockup 3 screenshots at 1440px, and at 1280px and 1024px. Fix what differs.
5. From a fresh clone: `npm install`, `npm run dev`, use every section and action in Chrome the way a salesperson would, with the console open. Type Korean with a Korean keyboard in search and forms. Unplug the network and use it again.
6. Finish `docs/STATUS.md`.

Done when `npm test` passes and the hand checks in Proof are done.

Delivers TEST-3, TEST-4, TEST-5, PERF-1 to PERF-4, A11Y-1, A11Y-7, APP-1, APP-12, and success criterion 10.

## Risks

**The riskiest step** is phase 5, the board with about 1,000 deals: up to 170 cards in a lane, dragged by mouse and by keyboard, with totals that change before the save. That's why the phase starts by measuring.

| Risk | What could go wrong | What we do | Checked by |
| --- | --- | --- | --- |
| Board speed | Dragging stutters with 150 or more cards in a lane (PERF-3) | Measure first in phase 5. Keep cards light, with no hooks or queries inside a card. Virtualize lanes only if the measurement says so | `perf/board.spec.ts` |
| Keyboard drag across lanes | dnd-kit's keyboard moves work within one list but need help to move between lists. Enter both starts a drag and opens the deal | A key handler that moves the card to the next lane at the same height. Only Space starts a drag. The card menu as a second way | `crm/pipeline-keyboard.spec.ts` |
| Card order | The card the user sees after a drop isn't where the backend put it, or a refresh shuffles cards | The backend works out the number from the neighbors and sends it back. After each save the board is fetched again. Tests drop at the top, bottom, middle and into an empty lane, then refresh | `test_positions.py`, `crm/pipeline-mouse.spec.ts` |
| Totals worked out twice | The board's optimistic totals and the backend's disagree by a dollar | Both round half up. Both test suites read one list of cases, `backend/tests/crm/expected_revenue_cases.json` | `test_deal_rules.py`, `applyMove.test.ts` |
| Dates and time zones | A `YYYY-MM-DD` date shows as the day before in some time zones. SQLite drops the time zone from timestamps, so times show hours off. A fixed test date disagrees with the browser's clock | Dates are read as local dates. A UTC timestamp type gives back aware times. The frontend takes today from `/api/meta`. End-to-end tests use the real date and check against `/api/meta`; only pytest fixes the date | `dates.test.ts`, `test_activities.py` |
| "US$" | `ko-KR` currency formatting writes "US$12,500" | The narrow dollar sign | `money.test.ts` |
| Korean typing | Search runs on half-typed letters, or Enter submits while a letter is being typed. Playwright can't type through a Korean input method | Composition events in Vitest, and a hand check with a Korean keyboard in phase 8 | `SearchBox.test.tsx`, the form tests, hand check |
| Tests touching real data | A test opens `backend/data/accountable.db` and changes the user's data | Tests always set `ACCOUNTABLE_DB`. `conftest.py` and the e2e server start refuse the default path | `conftest.py`, `support/servers.ts` |
| Migrations losing data | A later change wipes entered records | Tables only ever come from migrations. A test starts twice and checks a hand-added record is still there | `test_startup.py` |
| Mac, Linux and Windows | The scripts that start and stop the two servers (the npm scripts in `package.json`, `scripts/dev.mjs` and `e2e/support/servers.ts`) work only on the system they were written on. On Windows, stopping `uv run` can leave the backend's Python process running, still holding port 8000 or 8100, so the next start fails | The npm scripts call Node scripts, with no shell commands that differ between systems, such as `rm`, `VAR=value` or `&`. Paths are joined by Node. tree-kill stops the whole process tree, Python included. Only Windows can be tested here, so the scripts use nothing that works on only one system | `npm run dev` and `npm test` each stopped and started twice in a row on Windows; a read-through of `scripts/` and `e2e/support/` |
| Offline | A font or library loads from the internet | All from npm and uv. The e2e fixture fails on any request that leaves `127.0.0.1`. A hand check with the network unplugged | `support/fixtures.ts`, hand check |
| Library warnings | Recharts warns about a chart with no size, or another library warns in the console, breaking APP-12 | The console check fails on the first warning, so it's fixed in the phase that brought it in | every e2e test |
| Reset while the app runs | `npm run seed` and the running backend lock each other out | One transaction for the reset and a busy timeout on both sides | `restart.spec.ts` |
| Dashboard drifting from the tables | The dashboard's figures and the tables count differently | The same backend rule functions feed both. The e2e test compares the dashboard with totals counted from `/api/deals` | `crm/dashboard.spec.ts` |
| Contrast | A lane tint, badge or chart label falls below 4.5:1 | Text uses the ink shades and the lane colors in 6.1. axe on every screen | `a11y.spec.ts` |
| Scope | Building things the intent leaves out | The "Not in the MVP" list in the intent is followed as written | review |

What this could break: the repo has no app yet, so nothing existing can break. The one thing at stake is the user's own data once they've started using the app. The test database rules and the migration test above guard it.

## Proof

`npm test` runs every test below except the hand checks, and fails if any fails. Passing tests is necessary but not enough: success criterion 10 needs the hand checks too.

### Backend unit tests (pytest, `backend/tests/`)

Together these are TEST-1. `test_startup.py` and `test_openapi.py` are in `backend/tests/core/`; the rest are in `backend/tests/crm/`.

| File | What it proves | IDs |
| --- | --- | --- |
| `test_startup.py` | A new database file is migrated and loaded with the sample. A second start keeps a record added by hand. Foreign keys are on. `ACCOUNTABLE_TODAY` sets today. Timestamps come back with a time zone. The guard stops a test that would use the real database | APP-2, APP-10, APP-11, DATA-1, DATA-2, SEED-1, TEST-1 |
| `test_seed.py` | The sample's shape: counts near 25, 70, 80 and 250; every status and stage; won and lost deals spread over 12 months; one won today; at least two won and one lost in the last 30 days; three or four late; some deals with no organization or contact; stage entries that match `furthest_open_stage`; a status entry per customer; the follow-up counts; nothing in the future. Two runs of `seed --yes` give the same data apart from ids. Any answer other than y changes nothing. The bulk helper loads about 1,000 of each | APP-6, SEED-1 to SEED-6 |
| `test_deal_rules.py` | Expected revenue rounding cases from the shared file. Open and late (no close date is never late; Won and Lost never late; yesterday late; today not late). Stage change: probability, close date unless set by hand, furthest stage only forward, the entry. Back to open keeps the close date and the contact's status. A probability set by hand stays until the next stage change. Won makes a customer when moved, created straight into Won, or given a new contact while Won, never lowering a status | RULE-1 to RULE-8 |
| `test_activities.py` | Exactly one record per activity. A future time is refused. Follow-up states. Automatic entries return 409 on edit and delete. A contact's timeline includes their deals' activities with the deal's name. A new main contact takes the deal's history. Newest first; 50 at a time | DATA-6, DATA-7, RULE-9 to RULE-11, API-5 |
| `test_positions.py` | Between two cards, top, bottom, empty column, renumbering when too close, order kept after renumbering | PIPE-6 |
| `test_organizations_api.py` | Add, read, edit, delete. 422 names the field; 404 for a missing record. `https://` added. Contact counts and open pipeline in the list. Detail with contacts and deals. Delete-impact counts. Deleting leaves contacts and deals with no organization | API-2, DATA-3, DEL-2 |
| `test_contacts_api.py` | Add, read, edit, delete. Email checked. New contacts are leads. A status changed by hand adds an entry. Delete-impact counts. Deleting clears the main contact on their deals and deletes their activities. The timeline endpoint | API-3, DATA-4, RULE-8, DEL-2 |
| `test_deals_api.py` | Add, read, edit, delete. Value and probability ranges. A closed deal needs a close date. Every deal response has `expected_revenue` and `is_late`. A stage change by edit follows RULE-3. Deleting removes its activities. Delete-impact counts | API-4, DATA-5, RULE-3, DEL-2 |
| `test_pipeline_api.py` | Six columns in order, cards in place order, open-only totals. Won and Lost by close date: 30 days ago is in, 31 is out. A move changes stage and place. A new deal goes to the top | API-6, RULE-14, PIPE-3, PIPE-4 |
| `test_dashboard_api.py` | On a small hand-made dataset: the four figures, the band, 12 months including this one with empty months at zero, the funnel (a won deal counts at every stage, a deal lost from Proposal at three, a deal added straight into Proposal at New and Qualified), the follow-up order and the 14-day window with the later count, the 10 newest entries | API-7, DASH-1 to DASH-6, DASH-9, DASH-10, DASH-12, DASH-13, RULE-12, RULE-13 |
| `test_meta.py` | Stages with Korean names and probabilities, statuses, kinds, industries in use, today. Health answers | API-1, API-8, DATA-8 |
| `test_openapi.py` | The committed `openapi.json` matches the backend | API-9 |
| `test_speed.py` | With the bulk data, `/api/dashboard` and `/api/pipeline` answer within 300 ms, and their queries use the indexes | PERF-4 |

### Frontend unit tests (Vitest, beside each module)

Together these are TEST-2.

| File | What it proves | IDs |
| --- | --- | --- |
| `lib/dates.test.ts` | "2026. 11. 23.", "2026. 1. 5.", "2026. 11. 23. (월)", "2026. 11. 23. 오후 3:20", chart months "12월" and "2026년 1월". A `YYYY-MM-DD` date stays the same day with the time zone set to UTC−8 and UTC+9 | KO-2, KO-3 |
| `lib/money.test.ts` | "$12,500", never "US$". Reads "12500", "12,500" and "$12,500"; refuses other text. Axis labels "$120K" and "$1.2M" | KO-4, FORM-5 |
| `lib/korean.test.ts` | 건, 명 and 곳. 을/를 and 과/와 picked for Korean names, both written for others | KO-5, KO-6 |
| `ui/DataTable/search.test.ts` | Upper and lower case, extra spaces, part matches, phone numbers by digits | TBL-2 |
| `ui/DataTable/sort.test.ts` | Korean order, empty values last in both directions | TBL-3 |
| `ui/SearchBox.test.tsx` | No search while a Korean letter is being typed; search once it's finished | TBL-2 |
| `ui/DataTable/DataTable.test.tsx` | `aria-sort`, 50 rows a page, search, sort and page kept in the address, the empty and no-results messages | TBL-1, TBL-3, TBL-6, UI-6 |
| `crm/organizations/OrganizationForm.test.tsx`, `crm/contacts/ContactForm.test.tsx`, `crm/deals/DealForm.test.tsx` | Labels and "(필수)". Korean messages when a field is left. Focus on the first wrong field. The deal form fills in the organization, the probability and today's close date. Enter while typing a Korean letter doesn't submit. Each feature's delete message with its counts | FORM-2, FORM-4, FORM-7, A11Y-3, DEL-2 |
| `ui/ConfirmDelete.test.tsx` | Focus starts on 취소. Shows the message it's given. The delete button is Raspberry ink with white text | DEL-1 |
| `crm/pipeline/applyMove.test.ts` | The card lands in the right place. Lane and board totals change. Rounding matches the shared cases file | PIPE-8, RULE-1 |
| `crm/pipeline/announcements.test.ts` | Korean messages for picking up, moving, dropping and putting back | PIPE-9 |
| `crm/dashboard/PipelineBand.test.tsx`, `crm/dashboard/Funnel.test.tsx` | Widths follow value, small segments keep their minimum width, labels and figures shown | DASH-9, DASH-10 |
| `ui/ChartPanel.test.tsx` | The text summary, and "표로 보기" shows the figures as a table | DASH-11, A11Y-6 |

### End-to-end tests (Playwright, `e2e/`)

Every test also fails on a console error or warning, or on a request that leaves `127.0.0.1` (APP-4, APP-12, TEST-4). Tests that change data start from `resetData()`. "SC" is the intent's success criterion.

| File | What it proves | Covers |
| --- | --- | --- |
| `smoke.spec.ts` | Opens on the dashboard with sample data. Every section has data. The current section has `aria-current`. The page is `lang="ko"`. Noto Sans KR is the font actually drawn. The glossary's words are in the nav and headings | SC 1, UI-1, KO-1, KO-9, LOOK-1, LOOK-2 |
| `crm/organizations.spec.ts` | Add, search, sort, edit and delete, each still there after a refresh. The delete dialog's text. Contacts and deals stay without the organization | SC 2, TBL, FORM-1, DEL-1, DEL-2, UI-4 |
| `crm/contacts.spec.ts` | The same for contacts, plus the status filter with its counts, search by phone digits, picking an organization with the combobox by keyboard | SC 2, SC 3, TBL-7, FORM-3 |
| `crm/deals.spec.ts` | The same for deals, plus the late switch and badge, the money field, the Korean date picker, the deal form filling in fields, and the dashboard's late figure opening the late deals | SC 2, TBL-8, FORM-4 to FORM-6, DASH-6 |
| `crm/records.spec.ts` | Each record page shows its linked records. Logging a note, call and email with a follow-up. Editing, deleting and finishing them. Automatic entries have no edit or delete. A contact's timeline shows their deal's stage changes. Every record name is a link. Deleting from a record's page goes back to its table | SC 3, SC 5, REC-1 to REC-6, DEL-3, UI-7 |
| `crm/pipeline-mouse.spec.ts` | Dragging to another lane changes stage and probability, and the deals table shows both. Dropping higher, lower and between two cards in its own lane. Every drop stays after a refresh. Totals change before a slowed-down save finishes. A failed save puts the card back with the message. "추가" in a lane. Moving to Won sets today's close date, makes the contact a customer and says so. Won and Lost show only the last 30 days. Late cards show the chip | SC 4, PIPE-1 to PIPE-8, RULE-3, RULE-7, RULE-14 |
| `crm/pipeline-keyboard.spec.ts` | Space, arrows and Space move a card across lanes and within one. Escape puts it back. Each step is announced. The card menu's 단계 이동, 위로 and 아래로. Enter opens the deal | SC 8, PIPE-5, PIPE-9 |
| `crm/dashboard.spec.ts` | The figures equal totals counted from the API. A deal moved to Won changes 이번 달 수주. A new follow-up appears; marking it done removes it. A band block opens the pipeline. Tooltips show on focus. "표로 보기" | SC 6, DASH-1 to DASH-13 |
| `restart.spec.ts` | Changes are still there after the backend restarts. While it's down, the banner shows, and the page recovers by itself. The seed command brings the sample back | SC 2, APP-6, APP-10, UI-5 |
| `keyboard.spec.ts` | One pass with the keyboard alone: nav, search, sort, paging, add, edit, delete, log an activity, mark a follow-up done. Dialogs keep focus inside and give it back | SC 8, A11Y-1, FORM-1 |
| `a11y.spec.ts` | axe finds no WCAG 2.1 AA problems on every screen, with and without each dialog open | SC 8, A11Y-2, A11Y-3, A11Y-7, LOOK-4 |
| `layout.spec.ts` | At 1280px the page doesn't scroll sideways and six lanes fit. At 1024px the page still doesn't, and the board scrolls inside its panel | APP-1, PIPE-7 |
| `perf/screens.spec.ts` | With the bulk data: each screen shows its content, not its loading shapes, within 1 second. Typing in search and clicking a heading update the table within 200 ms | SC 9, PERF-1, PERF-2, TEST-5 |
| `perf/board.spec.ts` | With the bulk data: during a one-second drag, no frame takes over 100 ms and the median is under 20 ms. Totals change within 200 ms of the drop. The dashboard and pipeline calls answer within 300 ms | SC 9, PERF-3, PERF-4, TEST-5 |

### Checks by hand

Done in phase 8, before the MVP is called done:

- From a fresh clone, `npm install`, then `npm run dev` opens the dashboard (APP-5, APP-14, SC 1).
- Every section and every action used in Chrome the way a salesperson would, with the console open (SC 10, APP-12).
- Each screen checked by eye against the mockup 3 screenshots: colors, corners, spacing, no gradients, no one-edge borders, icons with labels (LOOK-5 to LOOK-8, LOOK-10, 6.1, SC 7).
- Korean typed with a Korean keyboard in search and in forms, including Enter mid-letter (TBL-2, FORM-7).
- The network unplugged, then the app started and used (APP-4).
- The Korean wording read through for tone (KO-7, KO-8).
