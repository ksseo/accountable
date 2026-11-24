# Spec: Accountable

This file describes the whole product as it stands today: what it's for, how it works and how it looks. It's the authority on all of that. A change edits it on its own branch, so that it's right again the moment the change is merged. A change's `intent.md` and `plan.md` say why and how that one change was made; where they and this file disagree, this file is right.

The stack is in `docs/TECH_STACK.md` and the brand in `.claude/skills/brand/SKILL.md`. How to run the app is in `docs/STATUS.md`.

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## The product

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it's a complete sales CRM for one person, running on their own computer: a private Salesforce that does the everyday CRM essentials really well. It should feel sharp, modern and professional, and be a pleasure to use.

**Who it's for:** one salesperson who uses it every day. They aren't technical, they work in Korean, and someone has already installed Node and uv on their computer. No other systems are involved.

**Four kinds of record:** organizations (the companies we do business with), contacts (the people, including leads and customers), deals (potential sales) and activities (what happened, or needs to happen, with a contact or deal).

**Five sections:**

- **Dashboard**, the landing page: how sales are going at a glance, and the follow-ups that need doing. It should be visually stunning.
- **Organizations**, **Contacts** and **Deals**: a table of each, to search, sort, add, edit and delete. Each record has its own page with the records it's linked to; a contact's and a deal's also has a timeline.
- **Pipeline**: the deals as cards on a board, one column per stage, dragged from stage to stage.

**What it doesn't do:** sign-in, user accounts or several users; a dark mode or a layout for phones; AI features; email, calendar or phone integrations; currencies other than US dollars; reports beyond the dashboard; tags or custom fields; changing the pipeline stages; importing or exporting data; undoing a delete.

## Requirement IDs

Every requirement has an ID such as RULE-3, in bold brackets where it's stated. Plans, code and tests refer to these IDs without the brackets. IDs are never renumbered; a dropped requirement keeps its ID, struck through, with "Dropped" and the date.

| Prefix | Area | Section |
| --- | --- | --- |
| APP | shape of the app and commands | 1 |
| DATA | tables and fields | 2 |
| RULE | business rules | 3 |
| UI | layout shared by every screen | 4.1 |
| DASH | dashboard | 4.2 |
| TBL | the three tables | 4.3 |
| REC | record pages and timelines | 4.4 |
| PIPE | pipeline board | 4.5 |
| FORM | forms | 4.6 |
| DEL | deleting | 4.7 |
| API | JSON API | 5 |
| LOOK | look | 6 |
| KO | Korean text and formats | 7 |
| A11Y | keyboard and accessibility | 8 |
| PERF | speed | 9 |
| SEED | sample data | 10 |
| TEST | tests | 11 |
| SC | success criteria | 12 |

## 1. Shape of the app

- **[APP-1]** One salesperson, one computer, no sign-in. Light mode only. Designed for screens 1280px wide and up, and usable down to 1024px with no sideways scrolling of the page.
- **[APP-2]** `backend/`: FastAPI serving a JSON API under `/api`, using SQLAlchemy Core (no raw SQL) on a SQLite file at `backend/data/accountable.db`, which git ignores. On start it brings the database up to date with Alembic migrations, and loads the sample data if the database is new, both in one step, so a first start that's cut short is done again by the next one. Tables only ever come from migrations.
- **[APP-3]** `frontend/`: React, TypeScript and Vite. It only talks to `/api`, which Vite passes on to the backend. When the backend is down, Vite answers 503 with the header `X-Accountable-Offline`, which the frontend reads as unreachable (UI-5).
- **[APP-4]** No internet connection is needed, and losing it while the app is open changes nothing. Fonts and every library are installed by `npm install` or `uv` and served from this computer; nothing loads from a CDN or Google Fonts.
- **[APP-5]** `npm run dev`, from the repo root, starts the backend on `127.0.0.1:8000` and the frontend on `127.0.0.1:5173`, waits until both answer, prints the address, and opens the dashboard in the default browser (`npm run dev -- --no-open` doesn't). Ctrl+C stops both. Both listen only on this computer, and the backend answers only requests addressed to `127.0.0.1` or `localhost`. If a port is taken, it says so in plain words and stops; if the servers aren't ready within 90 seconds, it says so.
- **[APP-6]** `npm run seed` deletes all data and loads the sample data again, in one transaction. It first asks "모든 데이터를 지우고 샘플 데이터로 되돌릴까요? (y/N)" and does nothing unless the answer is y. `npm run seed -- --yes` skips the question, for scripts.
- **[APP-7]** `npm test` runs every test (the frontend type check, pytest, Vitest, then Playwright), stops at the first failure and fails if any fails. The tests use their own database file and their own ports (8100 and 5273), refuse to open the real database, and can run while `npm run dev` is running.
- **[APP-8]** The commands work the same on Mac, Linux and Windows: npm scripts only, with no shell-specific syntax, and Python started with `uv run`.
- **[APP-9]** `docs/STATUS.md` says how to install, start, reset and test the app. `README.md` is the course's own guide and is left as it is.
- **[APP-10]** Every change is saved to the database as it's made. It's still there after a browser refresh and after the app is stopped and started.
- **[APP-11]** "Today" is the computer's local date, taken from one backend function. The frontend gets it from `GET /api/meta`, never from the browser's clock. Tests can fix it with `ACCOUNTABLE_TODAY`.
- **[APP-12]** No errors or warnings appear in the browser's console on any screen or action.
- **[APP-13]** Code is organized by feature on both sides (organizations, contacts, deals, activities, pipeline, dashboard), each with its own routes, data access and screens. Shared code holds only what two or more features use. Data access stays in each feature's own module, so moving to Supabase later changes those modules and nothing else. "How the code is laid out" below has the rules.
- **[APP-14]** The one-time `npm install` installs everything: the Node packages, and then the Python packages through a `postinstall` script that runs `uv sync`. After that, starting, using, seeding and testing the app need no internet connection.
- **[APP-15]** Each request is one database transaction. A write takes SQLite's write lock at the start and waits up to 15 seconds for another writer, so a seed run and the running app don't fail on each other.
- **[APP-16]** After any save, delete or move, everything on screen is fetched again, so no figure is left out of date.
- **[APP-17]** Four environment variables change the defaults: `ACCOUNTABLE_DB` (the database file), `ACCOUNTABLE_API_PORT` and `ACCOUNTABLE_WEB_PORT` (the ports), and `ACCOUNTABLE_TODAY` (for tests).
- **[APP-18]** `npm run check` runs every check and fails if any of them fails. A warning counts as a failure. `npm run check:quick` runs the same checks without the end-to-end tests, and `npm run format` fixes the formatting. Everything but the tests runs together and all of it reports; the tests run once it passes. gitleaks is installed separately, and only these commands and committing need it.
- **[APP-19]** `npm install` adds a git hook with lefthook. Before each commit it formats the staged files and stages them again, then runs ESLint, tsc, ruff, ty and gitleaks, without the tests. A failure stops the commit, and so does gitleaks not being installed.
- **[APP-20]** Two hooks for Claude Code are in `scripts/hooks/`. When the agent finishes a turn, one runs `npm run check:quick` and sends a failure back to it, once per turn. The other refuses the agent's edits to `.env`, and any shell command of its that names `.env`.
  - Prettier and ESLint, over the frontend, the end-to-end tests and the scripts, with the recommended TypeScript, React Hooks and accessibility rules;
  - ruff's formatting and lint checks, over the backend;
  - a cyclomatic complexity of at most 15 per function, on both sides;
  - tsc for the frontend and ty for the backend;
  - gitleaks, over git's history on every branch and the files on this computer. Among the files it allows two things git ignores: `.env`, where this computer's own keys go, and the installed packages. A `.env` that's been committed is reported;
  - every test (APP-7).

### Libraries

Mature libraries do these jobs, and none of them is hand-rolled (`docs/TECH_STACK.md`).

| Job | Library |
| --- | --- |
| Routing | React Router |
| Server data and caching | TanStack Query |
| Calling the API with generated types | openapi-fetch, openapi-typescript |
| Tables (sort, search, pages) | TanStack Table |
| Charts | Recharts |
| Drag and drop on the board by mouse | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) |
| Drawing only the cards in view | TanStack Virtual |
| Dialogs, menus, selects, comboboxes, date picker, checkboxes | React Aria Components, with `I18nProvider locale="ko-KR"`, and `@internationalized/date` for its dates |
| Forms and validation | React Hook Form with Zod (`@hookform/resolvers`) |
| Icons | Lucide React |
| Font | `@fontsource/noto-sans-kr` |
| Styles | CSS Modules and CSS custom properties for the brand tokens |
| Running both servers | concurrently, open |
| Backend | FastAPI, Pydantic, email-validator, SQLAlchemy Core, Alembic, Uvicorn |
| Checks | Prettier; ESLint with typescript-eslint, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`; ruff; ty; gitleaks; lefthook |
| Tests | Vitest with Testing Library; pytest with FastAPI's TestClient; Playwright Test with `@axe-core/playwright` and tree-kill |

### How the code is laid out

Products, quotes, invoices, bills, accounting, sign-in and a move to Supabase are all likely next. The layout takes those without moving what's already there, using folders and a few rules rather than abstractions. The backend and the frontend follow the same four rules:

1. **The top level holds only the ways in.** In the backend that's `main.py`, `seed.py` and `openapi.py`. In the frontend it's `main.tsx` and `app/`, the frame around every page.
2. **Shared code holds what every area needs and no business rules.** In the backend that's `core/`. In the frontend it's `api/`, `styles/`, `lib/` and `ui/`. Nothing in them knows about deals or stages.
3. **Each business area is one folder** with its own tables, routes, sample data and screens. There's one area so far, `crm`. A later area, such as `invoicing` or `accounting`, is a sibling folder.
4. **Inside an area, one folder per feature.** Imports between features go one way, so there are no cycles:
   - `activities` and `organizations` use no other feature;
   - `contacts` may use `activities` and `organizations`;
   - `deals` may use `contacts`, `organizations` and `activities`;
   - `pipeline` may use `deals`;
   - `dashboard` may use `deals` and `activities`.

   Every feature may use its area's shared files and the shared code. The shared files use no feature, apart from the backend's `router.py`, `sample.py` and `bulk.py`, which no feature uses. A page that opens another feature's form, such as "영업 기회 추가" on an organization's page, asks for it through the area's `openForms.ts`. A test on each side checks all of this.

Adding an area touches its own folders, plus one line each in the backend's `main.py`, `seed.py` and `migrations/env.py` (with a new migration) and in the frontend's router and top bar. Nothing in `crm` changes.

| Path | What it holds |
| --- | --- |
| `scripts/` | `dev.mjs` (`npm run dev`) and `api-types.mjs` (`npm run api:types`) |
| `backend/accountable/core/` | Settings, the clock, the database and the shape of errors. Everything specific to SQLite is in `db.py` |
| `backend/accountable/migrations/` | One Alembic history for the whole app |
| `backend/accountable/crm/` | The area's shared files: `tables.py` (the four tables, which point at each other), `stages.py`, `fields.py` (field rules), `figures.py` (expected revenue and lateness), `meta.py`, `router.py`, `sample.py` and `sample_data.py`, `bulk.py` |
| `backend/accountable/crm/<feature>/` | `routes.py` (endpoints), `repo.py` (data access), `schemas.py` (shapes) and `rules.py` (plain functions), as needed. `pipeline/` has `positions.py` |
| `frontend/src/app/` | The router, the top bar, the connection banner and the messages |
| `frontend/src/api/` | The API client and the generated types |
| `frontend/src/lib/`, `styles/`, `ui/` | Formats and Korean text; tokens and global styles; shared components, with the table in `ui/DataTable/` |
| `frontend/src/crm/` | The area's shared files, and one folder per feature with its pages, forms and `api.ts` |
| `backend/tests/`, `frontend/src/**/*.test.ts(x)`, `e2e/` | The tests (section 11) |

## 2. Data

- **[DATA-1]** Every table has an integer `id`, and `created_at` and `updated_at` timestamps. Money is stored in whole US dollars as an integer. Dates with no time (close date, follow-up date) are stored as ISO dates. Timestamps are stored in UTC and shown in local time.
- **[DATA-2]** SQLite foreign keys are turned on for every connection.
- **[DATA-9]** Text is trimmed before it's saved, and optional text left blank is saved as empty.

### organizations

**[DATA-3]**

| Field | Type | Rules |
| --- | --- | --- |
| name | text | required, up to 200 characters |
| website | text | optional, up to 2,000 characters; `https://` is added if it doesn't start with a scheme |
| industry | text | optional, up to 200 characters, free text, with suggestions from the industries already used |
| notes | text | optional, up to 5,000 characters |

### contacts

**[DATA-4]** A lead is a contact with the lead status, so there's no separate list of leads.

| Field | Type | Rules |
| --- | --- | --- |
| name | text | required, up to 200 characters, one field for the whole name |
| email | text | optional, must be a valid email address |
| phone | text | optional, free text, up to 40 characters |
| job_title | text | optional, up to 200 characters |
| organization_id | int | optional; set to empty when the organization is deleted |
| status | text | `lead`, `qualified` or `customer`; new contacts start as `lead` |

### deals

**[DATA-5]**

| Field | Type | Rules |
| --- | --- | --- |
| name | text | required, up to 200 characters |
| organization_id | int | optional; set to empty when the organization is deleted |
| contact_id | int | optional, the main contact; set to empty when the contact is deleted |
| stage | text | `new`, `qualified`, `proposal`, `negotiation`, `won` or `lost` |
| value | int | required, US dollars, 0 to 1,000,000,000 |
| probability | int | 0 to 100 |
| close_date | date | expected close date while open, actual once won or lost; optional while open, always set once closed |
| position | real | the card's place in its stage column (PIPE-6) |
| furthest_open_stage | text | the highest open stage the deal has been in, for the funnel (RULE-13) |

### activities

**[DATA-6]**

| Field | Type | Rules |
| --- | --- | --- |
| kind | text | `note`, `call`, `email`, or `stage_change` and `status_change`, which only the app makes |
| contact_id | int | the contact it's logged on; deleted with the contact |
| deal_id | int | the deal it's logged on; deleted with the deal |
| description | text | required for notes, calls and emails, up to 5,000 characters |
| occurred_at | timestamp | when it happened; defaults to now; can't be in the future, with a minute's slack |
| follow_up_date | date | optional |
| follow_up_done | bool | false by default |
| from_value, to_value | text | the old and new stage or status, on automatic entries only |

- **[DATA-7]** Each activity is logged on exactly one record: either `contact_id` or `deal_id` is set, never both and never neither.

### Stages

**[DATA-8]** The stages are fixed in code and served by `GET /api/meta`.

| Stage | Korean | Probability | Open |
| --- | --- | --- | --- |
| new | 신규 | 10% | yes |
| qualified | 적격 | 25% | yes |
| proposal | 제안 | 50% | yes |
| negotiation | 협상 | 75% | yes |
| won | 수주 | 100% | no |
| lost | 실주 | 0% | no |

## 3. Rules

The rules live in plain backend functions in the feature they belong to, with unit tests, and the API applies them. The frontend doesn't work them out itself, except to update the board's totals the moment a card is moved (PIPE-8).

1. **[RULE-1] Expected revenue** of a deal is value × probability ÷ 100, rounded half up to the dollar. Totals add up the rounded figures.
2. **[RULE-2] Open pipeline** means deals in New, Qualified, Proposal and Negotiation. Open totals never include Won or Lost.
3. **[RULE-3] Stage change.** When a deal's stage changes, whether by dragging, the card's menu, the deal form or the deal page, these happen together in one transaction:
   - the probability becomes the new stage's usual probability, unless the same save sets one by hand (the deal form fills in the usual one when its stage is changed, so what's saved is what was on screen);
   - if the new stage is Won or Lost, the close date becomes today, unless the same save sets one by hand;
   - `furthest_open_stage` becomes the new stage if that's an open stage further along;
   - the card goes to the top of its new column, unless it was dropped at a place in it;
   - a `stage_change` entry is added to the deal's timeline, shown as "단계 변경: 제안 → 협상";
   - RULE-7 runs.
4. **[RULE-4] Probability by hand.** A probability set in the deal form is kept until the stage next changes.
5. **[RULE-5] Back to open.** A Won or Lost deal can move back to an open stage under RULE-3. It keeps its close date, which may make it late at once, and its contact keeps their status.
6. **[RULE-6] Late.** A deal is late when it's open, has a close date, and that date is before today. Won and Lost deals are never late.
7. **[RULE-7] Won makes a customer.** Whenever a save leaves a deal in Won with a main contact who isn't a customer, that contact becomes a customer, and a `status_change` entry is added to their timeline: "상태 변경: 적격 → 고객 (‘2027 포장재 공급’ 수주)", with the deal's name as it was then. This covers a deal moved to Won, added straight into Won, or given a new main contact while Won.
8. **[RULE-8] Status changes.** A contact's status is never lowered automatically. A change made by hand in the contact form also adds a `status_change` entry.
9. **[RULE-9] Timelines.** A deal's timeline is its own activities. A contact's timeline is their own activities plus the activities of the deals where they're currently the main contact, each marked with the deal's name. Both are newest first by `occurred_at`.
10. **[RULE-10] Follow-ups.** An activity with a follow-up date that isn't done is a task. It's overdue when the date is before today, due today when it's today, and upcoming when it's later.
11. **[RULE-11] Automatic entries are fixed.** `stage_change` and `status_change` entries can't be edited or deleted by hand. They go only when their record is deleted.
12. **[RULE-12] Won and lost by month.** Deals won and revenue won in a month count deals in Won whose close date falls in that month. Deals lost count the same way.
13. **[RULE-13] Sales funnel.** The deals counted are every open deal plus every deal won or lost with a close date in the 12 months the charts show: this month and the 11 before it. A deal counts at an open stage if it's Won or its `furthest_open_stage` is that stage or later, and at Won if it's Won. So a won deal counts at every stage, a deal lost from Proposal counts at New, Qualified and Proposal, and a deal added straight into Proposal counts as having passed New and Qualified. For each stage the funnel shows the total value and number of deals that reached it, and that value as a share of the value at New.
14. **[RULE-14] Board columns.** Open columns show all their deals. The Won and Lost columns show deals whose close date is no earlier than 30 days before today.
15. **[RULE-15] A new deal** goes to the top of its column, with its stage's usual probability unless one is set. Added straight into Won or Lost, it takes today as its close date unless one is set, and its `furthest_open_stage` is New. Adding it makes no `stage_change` entry.

## 4. Screens

### 4.1 Shared layout

- **[UI-1]** A navigation bar with the wordmark "Accountable", which opens the dashboard, and the five sections in this order: 대시보드, 거래처, 연락처, 영업 기회, 파이프라인. The current section is marked visually and with `aria-current="page"`. On the right, "영업 기회 추가" opens the deal form on any page. The bar runs across the top of the page, with no sidebar (6.1).
- **[UI-2]** Each page starts with a header row: the page title, a one-line summary in plain words (for example "연락처 248명 · 고객 61명"), and the page's actions as buttons on the right. The browser tab says the title and "Accountable".
- **[UI-3]** Content sits in white panels on the page background, rounded, with no outline (LOOK-6).
- **[UI-4]** Saving, deleting and moving show a short message that disappears by itself after 4 seconds, such as "저장했어요" or "김민준 님이 고객이 되었어요", announced to screen readers. At most three show at once. One that fails says so and to try again ("저장하지 못했어요. 다시 시도해 주세요."), and a form stays open with what was typed.
- **[UI-5]** While data loads, panels show their shape in a muted color instead of a spinner. If the backend can't be reached, a banner says "서버에 연결할 수 없어요. 터미널에서 npm run dev가 실행 중인지 확인해 주세요." and the page retries by itself, every 2 seconds. If something can't be loaded for another reason, its place says "불러오지 못했어요" with a "다시 시도" button, and no count is shown for it.
- **[UI-6]** An empty table or list says so and, where there's an obvious next step, offers it, such as "아직 거래처가 없어요" with a "거래처 추가" button. A search with no results says "‘한빛’과(와) 일치하는 결과가 없어요", with the right particle (KO-6).
- **[UI-7]** Every record name shown anywhere (in tables, on cards, in timelines, in the dashboard's lists) links to that record's page.
- **[UI-8]** A record that isn't there, or an address such as `/deals/abc`, says "찾을 수 없어요" with a link to its table. Any other unknown address says "페이지를 찾을 수 없어요" with a link to the dashboard.

### 4.2 Dashboard (`/`)

The landing page. Which figures each panel shows is set here; how they're arranged is in 6.1.

- **[DASH-1]** All figures come from one call, `GET /api/dashboard`, so they agree with each other. The dashboard fetches fresh figures every time it's shown, so a deal marked won or a new follow-up shows up straight away.
- **[DASH-2]** Header: the title, and today's date with what needs attention, "2026. 11. 23. (월). 기한 지난 후속 조치 3건과 지연된 영업 기회 2건이 있어요.", or that nothing does.

Four figures, amounts in bold at a large size:

- **[DASH-3]** **진행 중 파이프라인**: total value of open deals, and how many.
- **[DASH-4]** **예상 매출**: expected revenue of open deals (RULE-1), and its share of the open pipeline ("파이프라인의 35%").
- **[DASH-5]** **이번 달 수주**: revenue won this month and how many deals, with the change against last month ("지난달보다 18% 증가", "지난달과 같아요"), or "지난달 $0" when there's nothing to compare with.
- **[DASH-6]** **지연된 영업 기회**: how many late deals and their total value, in Raspberry ink if there are any. It links to the Deals table showing only late deals.

Charts:

- **[DASH-7]** **월별 수주 금액** (line chart): revenue won per month for the last 12 months, including this one, with the 12-month total in the heading and the amount beside this month's point. Hovering or focusing a month shows the month and amount.
- **[DASH-8]** **월별 수주·실주 건수** (bar chart): deals won and deals lost per month for the same 12 months, side by side, won in Sea Green and lost in Coral, each bar labeled with its count, and zero left blank.
- **[DASH-9]** **단계별 파이프라인** (visual of the pipeline): one band across the top panel, under the four figures. Each open stage is a block in its stage color, its width set by the stage's total value, showing the stage name, the number of deals and the total value. A small stage takes at least 14% of the band so its label still fits. Under each block, a bar shows how much of the stage's value is expected revenue, with the amount ("예상 $48,250"). A line under the band says "칸의 너비는 단계별 금액, 아래 막대는 그중 예상 매출의 비율이에요." Clicking a block opens the Pipeline board.
- **[DASH-10]** **영업 퍼널** (sales funnel): New, Qualified, Proposal, Negotiation and Won as segments that narrow from top to bottom, each width set by the value that reached that stage (RULE-13), and at least 28% of the widest so small segments stay readable. Beside each: the value, the number of deals and the share of New. Underneath: "신규 → 수주 전환율 (금액 기준)" with its percentage.
- **[DASH-11]** Each chart has a short text summary for screen readers, and its figures are available as a table (A11Y-6).

Lists:

- **[DASH-12]** **후속 조치**: every overdue follow-up, then those due today, then those due in the next 14 days, soonest first. Each shows the date ("3일 지남" in Raspberry ink, "오늘", or "11. 25."), the description, and the contact (with their organization) or deal it's on. A checkbox marks it done, and it leaves the list. The heading counts the overdue ones and today's; a line underneath says how many are due later.
- **[DASH-13]** **최근 활동**: the 10 newest timeline entries of any kind across all records, with the record they're on and when ("오늘 오전 10:42", "11. 20. 오후 4:30", or in full in another year).

### 4.3 Tables (`/organizations`, `/contacts`, `/deals`)

- **[TBL-1]** Each table loads all its rows in one call and searches, sorts and pages them in the browser, 50 rows to a page. Under it are the range shown, the page number and 이전 and 다음. An address past the last page shows the last one.
- **[TBL-2]** **Search** narrows the rows as you type. It matches any part of the fields listed below, ignores upper and lower case and spaces, and matches phone numbers by three or more of their digits alone, so "01012345678" finds "010-1234-5678". It waits until a Korean letter is finished being typed before searching.
- **[TBL-3]** **Sort**: clicking a column heading sorts by it, smallest first, and clicking again reverses it, one column at a time. The heading shows the direction and has `aria-sort`. Text sorts in Korean order (`Intl.Collator('ko')`, with numbers inside text in number order), status and stage in their own order, and empty values always go last.
- **[TBL-4]** "거래처 추가" and "연락처 추가" in the page header open the add form; for deals it's the top bar's "영업 기회 추가" (UI-1). Each row has 수정 and 삭제 in a row menu, which can be reached by keyboard. Clicking a row opens the record's page.
- **[TBL-5]** Columns, search fields and default sort:

| Table | Columns | Search looks in | Default sort |
| --- | --- | --- | --- |
| 거래처 | 이름, 업종, 웹사이트 (opens in a new tab), 연락처 수, 진행 중 영업 기회 (number and value, sorted by value) | name, industry, website | name |
| 연락처 | 이름, 상태, 직책, 거래처, 이메일, 전화번호 | name, email, phone, job title, organization name | name |
| 영업 기회 | 이름, 단계, 거래처, 주 연락처, 금액, 확률, 예상 매출, 마감일 | name, organization name, contact name | close date, soonest first |

- **[TBL-6]** Search, sort, page and filters are kept in the page address (`q`, `sort`, `dir`, `page`, `status`, `late`), so a refresh or the browser's Back button keeps them.
- **[TBL-7]** Contacts have a status filter above the table: 전체, 리드, 적격, 고객, each with its count.
- **[TBL-8]** Deals have a "지연된 것만" switch with the number of late deals. A late deal's row shows a "지연" badge beside its close date, in text as well as color.

### 4.4 Record pages and timelines

- **[REC-1]** **Organization** (`/organizations/:id`): name, industry, website (opens in a new tab), notes; 수정 and 삭제; figures for its open pipeline and its revenue won, each with its number of deals; its contacts and its deals as short lists, each linking to the record and each with an "추가" button that opens the form with the organization filled in.
- **[REC-2]** **Contact** (`/contacts/:id`): name, status badge, job title, organization link, email (a `mailto:` link) and phone (a `tel:` link); 수정 and 삭제; the deals where they're the main contact, with an "추가" button that opens the deal form with the contact and their organization filled in; their timeline (RULE-9).
- **[REC-3]** **Deal** (`/deals/:id`): name, stage, value, probability, expected revenue, close date with the late badge if late, organization and main contact links; a stage selector that moves the deal under RULE-3; 수정 and 삭제; its timeline.
- **[REC-4]** **Timeline**: entries newest first, each with an icon and label for its kind (메모, 통화, 이메일, 단계 변경, 상태 변경), the date and time ("2026. 11. 23. 오후 3:20"), the description, and on a contact's timeline the deal it came from. The heading says how many there are. The first 50 show, with "더 보기" for the rest.
- **[REC-5]** **Logging an activity**: above the timeline, a form with the kind (메모, 통화, 이메일), the description, when it happened (by default, when it's saved; until it's changed, the time shown keeps up with the clock) and an optional follow-up date. It's logged on the record whose page it's on.
- **[REC-6]** A note, call or email in the timeline can be edited (kind, description, when, follow-up date, done) and deleted. A follow-up shows its date, how many days overdue it is, and a checkbox to mark it done or not done.

### 4.5 Pipeline (`/pipeline`)

- **[PIPE-1]** One column per stage, in order. The header above the board shows the total value and expected revenue of open deals, with a band of each stage's share of the value under it. Each open column's heading shows its stage name, number of deals, total value and expected revenue. The Won and Lost headings show their number of deals and total value, and say "최근 30일".
- **[PIPE-2]** Each card shows the deal's name (up to two lines), its organization, its value, its probability and its close date, or "마감일 없음". A late card shows the "지연" badge and how many days late, in Raspberry ink.
- **[PIPE-3]** Dragging a card to another column changes its stage under RULE-3. Dragging it within a column changes its place. It can be dropped anywhere in a column, below every card whose middle is above its own, and stays exactly there, including after a refresh. Dropped outside the columns, it goes back. Letting go after Escape, or after a drag, opens nothing.
- **[PIPE-4]** Each column has an "추가" button that opens the deal form with that stage already chosen. The new deal goes to the top of the column.
- **[PIPE-5]** Clicking a card, or pressing Enter on it, opens the deal's page.
- **[PIPE-6]** A card's place is a number between its neighbors' numbers. The frontend sends the move as the new stage and the cards it now sits between, and the backend works out the number: halfway between the two, or 1024 past the first or last card. If a gap would fall below 0.001, the backend renumbers that column in steps of 1024.
- **[PIPE-7]** At 1280px the six columns fit with no sideways scrolling. On narrower screens the board scrolls sideways inside its own panel, and the page doesn't. A column taller than the window scrolls inside itself.
- **[PIPE-8]** A move shows at once: the card moves, and the board's and the columns' totals change, as soon as the card enters a column and before the save finishes. If the save fails, the card goes back and a message says "이동하지 못했어요. 다시 시도해 주세요."
- **[PIPE-9]** By keyboard, a focused card can be picked up with Space, moved with the arrow keys between columns and up and down, dropped with Space or Enter, and put back with Escape, by moving on to something else, or by pressing the mouse anywhere. Each step is announced in Korean. Each card also has a menu with "단계 이동" (a list of stages; the card goes to the top), "위로", "아래로", 수정 and 삭제, for anyone who finds the drag keys awkward.
- **[PIPE-10]** A column draws only the cards in view and three above and below them, so dragging stays smooth with 150 or more cards (PERF-3). A dragged card is drawn in an overlay, so it stays on screen while its column scrolls.

### 4.6 Forms

- **[FORM-1]** Adding and editing happen in a dialog over the current page. Focus moves into the dialog, stays inside it, and goes back where it was when it closes. Escape closes it, but if something has been typed or changed it asks first ("저장하지 않고 닫을까요?", with 계속 입력 and 버리기, and focus on 계속 입력). 취소 and 닫기 close it at once. A click outside doesn't close it.
- **[FORM-2]** Every field has a visible label. Required fields say "(필수)". Messages appear under the field in Korean as soon as the field is left, such as "이름을 입력해 주세요" or "올바른 이메일 주소가 아니에요", and the first wrong field gets focus when saving. A field the backend refuses gets its message the same way.
- **[FORM-3]** Organization and contact are picked with a combobox that searches as you type, works by keyboard, and handles 1,000 options by listing the first 50 that match. Emptying it clears the choice. Industry is free text with suggestions (DATA-3).
- **[FORM-4]** In the deal form, choosing a contact who belongs to an organization fills in the organization if it's empty. Changing the stage fills in that stage's probability, and choosing Won or Lost fills in today's close date. Both can still be changed before saving. Going back to the deal's saved stage gives back its probability and close date, and leaving Won or Lost for an open stage gives back the close date from before.
- **[FORM-5]** The value field takes "12500", "12,500" or "$12,500" and shows "$12,500" once you leave it.
- **[FORM-6]** Dates are picked with the React Aria date picker in Korean, showing "2026. 11. 23." whatever language the browser uses. When an activity happened is typed into a date and time field, to the minute.
- **[FORM-7]** Pressing Enter while a Korean letter is still being typed doesn't submit the form.

### 4.7 Deleting

- **[DEL-1]** Deleting always opens a confirmation dialog first. Focus starts on 취소. The delete button is in Raspberry ink with white text, and waits for the counts. There's no undo; the dialog is the safeguard.
- **[DEL-2]** The dialog says what will happen to linked records, with counts from `GET /api/<kind>/<id>/delete-impact`. A part with nothing to count is left out, and an organization with nothing linked says so:
  - Organization: "‘한빛정밀’을 삭제할까요? 연락처 3명과 영업 기회 2건은 그대로 남고, 거래처 연결만 해제돼요."
  - Contact: "‘김민준’ 님을 삭제할까요? 영업 기회 2건은 그대로 남고 주 연락처가 비워져요. 이 연락처에 기록된 활동 5건은 함께 삭제돼요."
  - Deal: "‘2027 포장재 공급’을 삭제할까요? 이 영업 기회에 기록된 활동 7건(단계 변경 기록 포함)이 함께 삭제돼요."
  - Activity, with its kind: "통화 기록을 삭제할까요?"
- **[DEL-3]** Deleting a record from its own page goes back to its table afterwards.

## 5. API

JSON under `/api`. Amounts are integers, dates are `YYYY-MM-DD`, timestamps are ISO 8601 with time zone. A wrong field returns 422 with the field name, and the frontend shows its own Korean message for each field. A missing record returns 404. A PATCH changes only the fields it's sent. Every response that lists deals includes `expected_revenue`, `is_late` and `days_late`, worked out by the backend.

- **[API-1]** `GET /api/meta`: stages with their Korean names and probabilities, statuses, activity kinds, the industries in use, and today's date.
- **[API-2]** Organizations: `GET /api/organizations` (with contact counts and open pipeline), `POST`, `GET /{id}` (with its contacts and deals), `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact`.
- **[API-3]** Contacts: `GET /api/contacts`, `POST`, `GET /{id}` (with organization and deals), `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact`, `GET /{id}/timeline?offset=`.
- **[API-4]** Deals: `GET /api/deals`, `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact`, `GET /{id}/timeline?offset=`, and `POST /{id}/move` with `{stage, after_id, before_id}` for the board: the cards above and below, either of which may be empty. A saved or moved deal comes back with `promoted_contact`, the contact it made a customer, if any.
- **[API-5]** Activities: `POST /api/activities` (with `contact_id` or `deal_id`), `PATCH /{id}`, `DELETE /{id}`. Editing or deleting an automatic entry returns 409.
- **[API-6]** `GET /api/pipeline`: the six columns with their cards in order and their totals, the board's totals, and the first day the Won and Lost columns cover (RULE-14).
- **[API-7]** `GET /api/dashboard`: everything in 4.2.
- **[API-8]** `GET /api/health`, for the dev script, the connection banner and the tests to know the backend is ready.
- **[API-9]** The frontend's types for the API are generated from FastAPI's OpenAPI schema by `npm run api:types`, so the two sides can't drift apart. A test fails until it's been run after an API change.

## 6. Look

The brand skill takes priority over general design guidance. Layout, spacing and detail come from the chosen mockup (6.1); where it and these rules disagree, these rules win.

- **[LOOK-1]** One font, bundled from npm (APP-4): Noto Sans KR, weights 400, 500, 600 and 700. It comes in many small pieces, and the browser loads only the pieces for the letters on screen.
- **[LOOK-2]** Everything uses `"Noto Sans KR", sans-serif`: text, headings, amounts, percentages, dates and the Accountable wordmark (bold). One font covers Korean, Latin letters and numbers, so a line never mixes typefaces. `font-variant-numeric: tabular-nums` lines numbers up. No italic anywhere, since Korean fonts have no italic.
- **[LOOK-3]** Colors are CSS custom properties in one file, named after the brand: `--sea-green`, `--marigold`, `--coral`, `--cerulean`, `--raspberry`, `--midnight`, `--sea-mist`, `--page` (`#F0F4F5`) and `--panel` (white), plus the ink shades below. Body text is Midnight.
- **[LOOK-4]** Bright brand colors are for fills: columns, bars, funnel segments, badges and large buttons, with Midnight text on Sea Green, Marigold, Coral and Sea Mist. For text, thin lines, small icons and white-on-color small text, use the darker ink shades. Each reaches 4.5:1 on white and on the page background:

| Color | Fill | Ink shade | Ink on white | Ink on page | White text on ink |
| --- | --- | --- | --- | --- | --- |
| Sea Green | `#06D6A0` | `#047A5C` | 5.33 | 4.81 | 5.33 |
| Marigold | `#FFC145` | `#8A6000` | 5.59 | 5.05 | 5.59 |
| Coral | `#F78C6B` | `#A8432A` | 6.00 | 5.42 | 6.00 |
| Cerulean | `#118AB2` | `#0D7194` | 5.52 | 4.98 | 5.52 |
| Raspberry | `#EF476F` | `#C2244C` | 5.75 | 5.19 | 5.75 |

White on Cerulean (3.96) and on Raspberry (3.62) are allowed only for large text (24px, or 18.7px bold). Midnight is 12.08 on white and 10.91 on the page background.

- **[LOOK-5]** Stage colors, used the same way on the board, the charts, the badges and the funnel: New Sea Green, Qualified Marigold, Proposal Coral, Negotiation Cerulean (its ink where it carries small white text), Won Midnight (white text), Lost Sea Mist (Midnight text). Raspberry means late or overdue, something wrong, or a delete. Contact statuses: 리드 Marigold, 적격 Cerulean ink, 고객 Sea Green.
- **[LOOK-6]** Panels and cards are white, rounded, with no outline. No border on one edge of a panel and no single line across the top of the page. Panels stand out from the page by color alone; a very soft shadow is allowed only on what floats over the page: a card being dragged, dialogs, menus, lists, the calendar and messages. Table rows are kept apart by a thin, faint line.
- **[LOOK-7]** No gradient fills. The area under the line chart is a flat, light Sea Green.
- **[LOOK-8]** Charts: thin lines and points use ink shades; bars and segments use fills with their value written in Midnight; grid lines are faint Sea Mist; tooltips are Midnight with white text.
- **[LOOK-9]** Keyboard focus shows a 2px Cerulean ink ring with a small gap, on every focusable thing.
- **[LOOK-10]** Icons are Lucide, at one stroke width, always beside a text label or with an accessible name.

### 6.1 Chosen mockup

The look follows **mockup 3, Stage lanes** (`docs/mockups/3-stage-lanes.html`, screenshots `3-stage-lanes-dashboard.png` and `3-stage-lanes-pipeline.png`). Its sample figures are only for the mockup. It was chosen because the open pipeline comes first on the dashboard, as one band of stage colors, so it's clear at a glance where the deals stand, and because it looks like a screen for daily work.

- **Top bar**: the wordmark on the left, with a small mark of four rounded blocks in the four open-stage colors. The five sections are a segmented control on a `#E3EAEC` track, with the current one on white. The Midnight "영업 기회 추가" button is on the right.
- **Dashboard**, on a 12-column grid with 22px gaps, in this order (below 1180px the panels stack):
  1. Full width: the top panel with the four figures (DASH-3 to DASH-6), the open pipeline largest, and the pipeline band under them (DASH-9).
  2. 월별 수주 금액 (7 columns) beside 월별 수주·실주 건수 (5 columns).
  3. 영업 퍼널 as stacked trapezoids, with the figures to their right (5 columns), beside 후속 조치 as one-line rows with the date on the right (7 columns).
  4. Full width: 최근 활동 in two columns.
- **Pipeline**: under the header, a thin band of the open stages with each stage's share of the open value written under it. Then six lanes, each with a light background in its stage's tint, holding white cards. A lane's head has the stage name in its ink shade, a count pill, the total, expected revenue ("최근 30일" for Won and Lost) and, for open stages, a bar for its share of the open value. The "추가" button sits at the top of the lane, above the cards. A late card starts with a "지연 N일" chip (a clock icon, white text on Raspberry ink), and its close date and probability turn Raspberry ink.
- **Record pages**, which have no mockup: details and linked records on the left (5 parts), and on the right (7 parts) the form and timeline, or an organization's figures and deals. One column below 1100px.
- **Sizes**: panels have 26px corners, lanes 22px and cards 14px. Page titles are 32px bold. The open pipeline figure is 40px and the other three figures 28px.
- **Where the app differs from the mockup**: "표로 보기" on the charts (DASH-11), ten recent activities (DASH-13), lanes that scroll (PIPE-7), and no "활동 기록" button in the dashboard's header, since an activity is always logged on a contact's or deal's page.

Lane colors. Every title and the muted text (`#4A6470`) on these tints reaches 4.5:1:

| Stage | Lane tint | Title ink | Title on tint | Muted text on tint |
| --- | --- | --- | --- | --- |
| 신규 | `#E1FAF3` | `#047A5C` | 4.86 | 5.73 |
| 적격 | `#FFF5DE` | `#8A6000` | 5.16 | 5.78 |
| 제안 | `#FEEDE7` | `#A8432A` | 5.28 | 5.52 |
| 협상 | `#E2F1F6` | `#0D7194` | 4.77 | 5.42 |
| 수주 | `#E3E9EC` | `#073B4C` | 9.85 | 5.12 |
| 실주 | `#EBF0F1` | `#4A6470` | 5.46 | 5.46 |

## 7. Korean text and formats

### 7.1 Glossary

**[KO-1]** These words are used everywhere, the same way. They're close to the words Korean Salesforce uses.

| English | Korean |
| --- | --- |
| Dashboard | 대시보드 |
| Organization / Organizations | 거래처 |
| Contact / Contacts | 연락처 |
| Deal / Deals | 영업 기회 |
| Pipeline | 파이프라인 |
| Lead, Qualified, Customer (status) | 리드, 적격, 고객 |
| New, Qualified, Proposal, Negotiation, Won, Lost (stage) | 신규, 적격, 제안, 협상, 수주, 실주 |
| Main contact | 주 연락처 |
| Value | 금액 |
| Probability of close | 확률 |
| Expected revenue | 예상 매출 |
| Close date | 마감일 |
| Late | 지연 |
| Activity; note, call, email | 활동; 메모, 통화, 이메일 |
| Follow-up | 후속 조치 |
| Overdue | 기한 지남 |
| Timeline | 타임라인 |
| Organization notes | 비고 |
| Name, email, phone, job title, website, industry | 이름, 이메일, 전화번호, 직책, 웹사이트, 업종 |
| Add, edit, delete, save, cancel, search | 추가, 수정, 삭제, 저장, 취소, 검색 |

### 7.2 Formats

- **[KO-2]** Dates: `Intl.DateTimeFormat('ko-KR')`, giving "2026. 11. 23." and "2026. 1. 5.". With a weekday: "2026. 11. 23. (월)". With a time: "2026. 11. 23. 오후 3:20". The dashboard's lists leave out the year (DASH-12, DASH-13).
- **[KO-3]** Chart months: "12월", and "2026년 1월" for January and for the first month on an axis. The bar chart leaves the first month's year out when January comes next, since the two years would run into each other.
- **[KO-4]** Amounts: US dollars, whole, with commas: "$12,500", never "US$". Chart axes may shorten them to "$120K" and "$1.2M"; everywhere else they're written in full.
- **[KO-5]** Counts take the right counter word: "3건" for deals, activities and follow-ups, "5명" for contacts, "4곳" for organizations.
- **[KO-6]** The particle after a name that ends in a Korean letter is worked out from that letter ("‘한빛정밀’을"). After any other name, both are written, as in "을(를)" and "과(와)".
- **[KO-7]** Sample data's names and descriptions may be Korean or English; the screens around them are always Korean.

### 7.3 Tone

- **[KO-8]** The brand's tone carried into Korean: plain and short, no jargon and no exclamation marks. Button labels are short nouns or verbs ("영업 기회 추가", "저장"). Messages use the polite 해요체 ("저장했어요", "삭제할까요?").
- **[KO-9]** The page's `lang` is `ko`.

## 8. Keyboard and accessibility

- **[A11Y-1]** Everything can be done by keyboard alone, in a sensible tab order: navigating, searching, sorting, paging, adding, editing, deleting, logging activities, marking follow-ups done and moving deals on the board (PIPE-9).
- **[A11Y-2]** Text meets WCAG 2.1 AA contrast (LOOK-4). Color is never the only signal: late, overdue, stage and status always have a word too.
- **[A11Y-3]** Every input has a label tied to it, and every icon-only button has an accessible name.
- **[A11Y-4]** Dialogs, menus, comboboxes and the date picker follow the WAI-ARIA patterns, which React Aria provides.
- **[A11Y-5]** Messages after saving, moving and deleting are announced through a polite live region (UI-4).
- **[A11Y-6]** Each chart has a text summary and a "표로 보기" toggle that shows its figures as a table.
- **[A11Y-7]** An automated accessibility check (axe) finds no WCAG 2.1 AA violations on any screen, with and without a dialog open (TEST-4). One rule is off for one check, the calendar's days; `docs/STATUS.md` says why.
- **[A11Y-8]** Transitions and animations are off for anyone whose computer asks for reduced motion.

## 9. Speed

With about 1,000 organizations, 1,000 contacts, 1,000 deals and 1,000 activities, measured on the test machine:

- **[PERF-1]** Each screen is ready within 1 second of being opened.
- **[PERF-2]** A table updates within 200 ms of a key being typed in search or a heading being clicked.
- **[PERF-3]** On the board, a card follows the pointer smoothly while dragged (no frame over 100 ms, the median under 20 ms), and the totals change within 200 ms of the drop.
- **[PERF-4]** `GET /api/dashboard` and `GET /api/pipeline` answer within 300 ms. Indexes cover the fields they filter and sort by (stage, close date, follow-up date and done, the foreign keys).

## 10. Sample data

- **[SEED-1]** Loaded when the database is new and by `npm run seed`. It's the same every time apart from its dates, which are set relative to today, so every screen looks alive whenever it's loaded. Nothing that has already happened is dated in the future.
- **[SEED-2]** The story: a Korean exporter of industrial parts and packaging, with customers at home and abroad. About 25 organizations, half Korean and half overseas (Japan, the US, Germany, Vietnam, Australia and others), across industries such as 제조, 식품, 화장품, 물류, 유통, 의료기기 and IT. Every name is made up; no real companies or people. Websites and email addresses use the reserved `.example` domain.
- **[SEED-3]** About 70 contacts with Korean or overseas names to match their organization, at every status, with some having no organization.
- **[SEED-4]** About 80 deals at every stage, valued from $2,000 to $250,000: won and lost deals spread across the past 12 months, so both monthly charts are filled; one won today; at least two won and one lost in the last 30 days, so those columns aren't empty; open deals closing over the next months; three or four late; and a few with no organization or contact.
- **[SEED-5]** About 250 activities: notes, calls and emails across contacts and deals over the past months; a stage-change entry for each step each deal took, consistent with its `furthest_open_stage`; a status-change entry for each customer; and follow-ups, with three or four overdue, one due today and five or six due in the next two weeks.
- **[SEED-6]** A separate helper, `uv run python -m accountable.crm.bulk`, replaces the data with about 1,000 of each kind of record, for the speed tests (PERF). It isn't part of `npm run seed`.

## 11. Tests

- **[TEST-1]** pytest, in `backend/tests/`: every rule in section 3, every API endpoint including validation and delete effects, the seed's shape, and a run of `npm run seed -- --yes` twice in a row. Each test has its own database file, with today fixed at 2026-11-23.
- **[TEST-2]** Vitest, beside each module: formatting (dates, amounts, counter words), search normalization, sorting in Korean order, the optimistic board totals, and form validation.
- **[TEST-3]** Playwright, in installed Chrome, in `e2e/`, against servers and a database of its own: each success criterion in section 12 as a user would do it, including drag and drop with the mouse and with the keyboard, a refresh after each change, and a restart of the backend.
- **[TEST-4]** Playwright with axe on every screen (A11Y-7). Every Playwright test also fails on a console error or warning (APP-12), or a request that leaves `127.0.0.1` (APP-4).
- **[TEST-5]** Playwright with the 1,000-record database for PERF-1 to PERF-4.
- **[TEST-6]** A leftover `.only` fails Vitest and Playwright.

What each test file proves:

| pytest | IDs |
| --- | --- |
| `core/test_startup.py` | APP-2, APP-5 (the address check), APP-10, APP-11, DATA-1, DATA-2, SEED-1 |
| `core/test_openapi.py` | API-9 |
| `crm/test_seed.py` | APP-6, SEED-1 to SEED-6 |
| `crm/test_deal_rules.py` | RULE-1 to RULE-8, RULE-15 |
| `crm/test_activities.py` | DATA-6, DATA-7, RULE-9 to RULE-11, API-5 |
| `crm/test_positions.py` | PIPE-6 |
| `crm/test_organizations_api.py`, `test_contacts_api.py`, `test_deals_api.py` | API-2 to API-4, DATA-3 to DATA-5, DATA-9, RULE-3, RULE-8, DEL-2 |
| `crm/test_pipeline_api.py` | API-6, RULE-14, RULE-15, PIPE-3, PIPE-4 |
| `crm/test_dashboard_api.py` | API-7, DASH-1 to DASH-6, DASH-9, DASH-10, DASH-12, DASH-13, RULE-12, RULE-13 |
| `crm/test_meta.py` | API-1, API-8, DATA-8 |
| `crm/test_imports.py` | APP-13 |
| `crm/test_speed.py` | PERF-4 |

| Vitest | IDs |
| --- | --- |
| `lib/` (dates, money, korean) | KO-2 to KO-6, FORM-5 |
| `api/` (client, queryClient, failedLoad) | APP-4, UI-5, FORM-2 |
| `ui/DataTable/` (DataTable, search, sort), `ui/SearchBox` | TBL-1 to TBL-4, TBL-6, UI-5, UI-6 |
| `ui/Dialog`, `ui/ConfirmDelete`, `ui/ChartPanel` | FORM-1, DEL-1, DASH-11, A11Y-6 |
| `crm/` forms of organizations, contacts and deals | FORM-2 to FORM-5, FORM-7, A11Y-3, DEL-2 |
| `crm/activities/` (ActivityForm, Timeline, kinds) | REC-5, REC-6, RULE-3, RULE-7, RULE-8, UI-5 |
| `crm/pipeline/` (applyMove, dropTarget, announcements) | PIPE-3, PIPE-8, PIPE-9, RULE-1, RULE-3 |
| `crm/dashboard/` (PipelineBand, Funnel, chartParts) | DASH-7, DASH-9, DASH-10, KO-3 |
| `crm/RecordMissing`, `crm/imports` | UI-5, UI-8, APP-13 |

| Playwright | Covers |
| --- | --- |
| `smoke.spec.ts` | SC 1, APP-4, UI-1, KO-1, KO-9, LOOK-1, LOOK-2 |
| `crm/organizations.spec.ts` | SC 2, TBL, FORM-1, DEL-1, DEL-2, UI-4 |
| `crm/contacts.spec.ts` | SC 2, SC 3, TBL-7, FORM-3 |
| `crm/deals.spec.ts` | SC 2, TBL-8, FORM-4 to FORM-6, RULE-7 |
| `crm/records.spec.ts` | SC 3, SC 5, REC-1 to REC-6, DEL-3, UI-5, UI-7, UI-8 |
| `crm/dialogs.spec.ts`, `crm/loading.spec.ts` | FORM-1, UI-5 |
| `crm/pipeline-mouse.spec.ts` | SC 4, PIPE-1 to PIPE-8, RULE-3, RULE-7, RULE-14, UI-7 |
| `crm/pipeline-keyboard.spec.ts` | SC 8, PIPE-5, PIPE-9 |
| `crm/dashboard.spec.ts` | SC 6, DASH-1 to DASH-13, A11Y-6 |
| `restart.spec.ts` | SC 2, APP-6, APP-10, UI-5 |
| `keyboard.spec.ts` | SC 8, A11Y-1, FORM-1 |
| `a11y.spec.ts` | SC 8, A11Y-2, A11Y-3, A11Y-7, LOOK-4 |
| `layout.spec.ts` | APP-1, PIPE-7 |
| `perf/screens.spec.ts`, `perf/board.spec.ts` | SC 9, PERF-1 to PERF-4 |

The rest is checked by a person; the list is under "Checks by hand" in `docs/STATUS.md`.

## 12. Success criteria

What has to be true of the product as a whole. The tests call these SC 1 to SC 10.

| SC | Criterion | Covered by |
| --- | --- | --- |
| 1 | Someone non-technical, with Node and uv installed, can install it once, start it with one command and land on the dashboard, with sample data on every screen | APP-5, APP-6, APP-9, APP-14, SEED |
| 2 | Organizations, contacts and deals can each be added, searched, sorted, edited and deleted, and every change is kept after a refresh and a restart. Deleting asks first, and linked records stay. The reset brings back the sample data | TBL, FORM, DEL, APP-10, APP-6, RULE-3 to RULE-8 |
| 3 | Contacts can be filtered by status, and each record's page shows the records it's linked to | TBL-7, REC-1 to REC-3 |
| 4 | Moving a card changes its stage, probability and the totals at once, and it stays where it was dropped. Late deals stand out; Won and Lost show the last 30 days, set the close date, and a win makes a customer | PIPE, RULE-3 to RULE-7, RULE-14 |
| 5 | Activities, follow-ups and stage changes show in timelines, newest first, and a contact's includes their deals'. Follow-ups stay on the dashboard until they're done | REC-4 to REC-6, RULE-9, RULE-10, DASH-12 |
| 6 | The dashboard's figures match the data, and reflect a deal marked won or a new follow-up | DASH-1, RULE-1, RULE-2, RULE-12, RULE-13 |
| 7 | Every screen is sharp, modern, professional and on-brand, in Korean, with Korean dates, US dollars and Noto Sans KR. The dashboard is visually stunning, with a line chart, a bar chart and a visual of the pipeline | LOOK, KO, DASH-7 to DASH-10 |
| 8 | Every action can be done from the keyboard, including moving a deal. Text has enough contrast and every input has a label | A11Y, PIPE-9, LOOK-4 |
| 9 | With about 1,000 of each record, nothing has a noticeable wait | PERF |
| 10 | Someone has used it end to end in a real browser, as a salesperson would, with each screen checked by eye and no errors in the console. Passing tests isn't enough | TEST-3, TEST-4, and a person using it by hand |

## 13. Later

Likely next, and kept possible by how it's built:

- Sign-in, several users and a record of who did what, when the rest of the sales team joins: data access sits in one module per feature (APP-13), so adding a user to each change, and moving to Supabase's database, changes those modules.
- Use beyond this computer: the backend only listens on `127.0.0.1` for now (APP-5). Deploying to Render later changes that, together with sign-in.
- Dark mode: colors are already tokens (LOOK-3), and the brand's dark surfaces can be added as a second set.
- ERP: products, quotes, invoices, bills and accounting, each as an area of its own (section 1).

## 14. Decisions

Choices that aren't obvious from the rest, and why.

### The product

- **One font for everything.** The brand's original fonts have no Korean letters, and a label such as "예상 $20,000" drawn in several fonts looked patchy (LOOK-2).
- **Ink shades.** White on Cerulean and Raspberry, and bright brand colors as text on white, fall below 4.5:1 (LOOK-4).
- **Six stages from five brand colors.** Raspberry means trouble, so a Raspberry "Won" column would read as a warning. Won is Midnight and Lost Sea Mist (LOOK-5).
- **One name field for a contact**, so Korean names (김민준) and overseas names (Sarah Kim) are both written naturally (DATA-4).
- **Links are optional.** A contact's organization, a deal's organization and main contact, and an open deal's close date can all be empty. A deal with no close date is never late.
- **A deal's history follows its main contact.** If the main contact changes, the whole history shows on the new contact's timeline instead (RULE-9).
- **A closed deal can be reopened.** It may show as late straight away, and its main contact stays a customer (RULE-5).
- **Won and Lost columns go by close date**, so editing a won deal's close date to more than 30 days ago takes it off the board. It stays in the Deals table (RULE-14).
- **Something to do later is a follow-up**, so an activity can't have happened in the future (DATA-6).

### The code

- **No ORM, service layer or generic CRUD code.** Rules are plain functions in their feature, and each feature writes its own few queries. A little repetition across three tables costs less than an abstraction they don't need.
- **No plugin system, and no package or workspace per area.** Folders and a handful of plain lines are enough until an area needs to ship on its own.
- **Tables sit together in `crm/tables.py`**, since they point at each other. Each later area gets its own `tables.py` on the same `MetaData`.
- **Searching, sorting and paging in the browser.** 1,000 rows is small (TBL-1).
- **No state library.** Server data lives in TanStack Query, table state in the page address, and form state in React Hook Form.
- **The funnel and the pipeline band are plain SVG and HTML.** Both need a minimum width per segment and the mockup's shapes, which Recharts can't do.
- **The board's keyboard moves are its own key handler.** dnd-kit's doesn't move cards between lists, and Enter has to open the deal (PIPE-9).
- **Only the cards in view are drawn.** With every card drawn, starting a drag with 170 cards in a lane took over a second (PIPE-10; measured in `docs/STATUS.md`).
- **The tests start the servers themselves**, not through Playwright's `webServer`, since one test restarts the backend. They reset data with the same seed command a user runs, so there are no test-only endpoints.
- **No production build.** The app runs with `npm run dev`, and the end-to-end tests run against the same dev server, so React's warnings show up in the console check.
