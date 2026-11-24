# Spec: the Accountable MVP

This spec turns `docs/intent.md` into requirements and a design. The intent says what and why; this file says how it works and how it looks. The stack is in `docs/TECH_STACK.md` and the brand in `.claude/skills/brand/SKILL.md`. The look of the dashboard and the pipeline follows mockup 3, Stage lanes, in `docs/mockups/`; the choice and the reasons are in 6.1.

## Concerns and answers

These were raised when the spec was first written and answered on 2026. 11. 23. The rest of the spec follows the answers.

1. **Korean names for sections, stages and statuses.** The intent names everything in English. *Answer:* use the glossary in 7.1 (거래처, 연락처, 영업 기회; 신규, 적격, 제안, 협상, 수주, 실주; 리드, 적격, 고객), which is close to the words Korean Salesforce uses.
2. **Fonts can't come from Google Fonts.** The brand says "From Google Fonts", but the app must work offline, and the brand didn't mention a Korean font. *Answer:* every font is bundled as an `@fontsource` npm package (LOOK-1), and the brand skill now names the Korean font and says it's bundled.
3. **The brand fonts have no Korean letters.** Instrument Sans, Instrument Serif and JetBrains Mono cover only Latin letters and numbers, so Korean text set in them falls back to another font. Korean fonts almost always include Latin letters and numbers. *Answer:* all text uses Noto Sans KR, the most widely used free Korean font, including Latin letters, numbers and amounts (LOOK-2). Its numbers are all the same width, so amounts still line up without JetBrains Mono. The Accountable wordmark uses it too, in bold, so no brand font is left. *Revised after the mockups:* the first answer kept the brand fonts for Latin letters and numbers with Noto Sans KR and Noto Serif KR behind them, but one short label such as "예상 $20,000" then drew on three fonts and the screens looked patchy.
4. **Some brand pairings fail the contrast the intent asks for.** White text on Cerulean measures 3.96:1 and on Raspberry 3.62:1, below the 4.5:1 needed for normal text. As text on white, Sea Green is 1.89:1, Marigold 1.62:1 and Coral 2.35:1. *Answer:* the darker ink shades in LOOK-4, which all reach 4.5:1 on white and on the page background, for text, thin lines and small white-on-color labels. The bright colors stay for large fills such as columns, bars, funnel segments and big buttons.
5. **Six stages, five brand colors, and Raspberry means alert.** A Raspberry "Won" column would read as a warning. *Answer:* New to Negotiation in the brand's order (Sea Green, Marigold, Coral, Cerulean), Won in Midnight, Lost in Sea Mist, and Raspberry only for late deals and overdue follow-ups (LOOK-5).
6. **Optional fields.** *Answer:* a contact's organization, a deal's organization and main contact, and an open deal's close date are all optional. A deal with no close date is never late.
7. **Whose timeline a deal's history appears in.** *Answer:* a contact's timeline shows the activities of the deals where they're the main contact now (RULE-9). If a deal's main contact changes, its whole history shows on the new contact's timeline instead.
8. **Automatic timeline entries.** *Answer:* stage changes and status changes can't be edited or deleted by hand (RULE-11). Notes, calls and emails can.
9. **A deal moved back from Won or Lost.** *Answer:* allowed. It takes the open stage's probability and keeps its close date, so it may show as late straight away, and its main contact stays a customer (RULE-5).
10. **Won and Lost columns go by close date.** *Answer:* "closed in the last 30 days" uses the close date. Editing a won deal's close date to more than 30 days ago takes it off the board; it stays in the Deals table (RULE-14).
11. **The pipeline with about 1,000 deals.** Each open column could hold 150 or more cards, and drag and drop with that many is the riskiest part for speed (PERF-3). *Answer:* render every card, keep cards light, and measure with 1,000 deals early in the build. If it's slow, render only the visible part of each column.

### Other decisions

- Amounts are whole US dollars, with no cents (DATA-1).
- A contact has one name field, so Korean names (김민준) and overseas names (Sarah Kim) are both written naturally (DATA-4).
- `npm run dev` opens the dashboard in the default browser when it's ready, and listens only on this computer (APP-5).
- A change to a contact's status by hand also appears in their timeline, the same as the automatic change to customer (RULE-8).
- Messages use the polite 해요체 ("저장했어요", "삭제할까요?"), with short noun labels on buttons (7.3).
- When a logged activity happened can't be in the future; something to do later is a follow-up (DATA-6).
- Search, sort and filters are kept in the page address, so a refresh or the browser's Back button keeps them (TBL-6).
- Deleting has no undo. The confirmation dialog is the safeguard (DEL-1).
- `npm install` also installs the Python packages, so after it the app never needs the internet (APP-14).
- `npm run seed` asks before it replaces the data, since it wipes everything entered by hand (APP-6).

## Requirement IDs

Every requirement has an ID such as RULE-3, in bold brackets where it's stated. The plan and the tests refer to these IDs without the brackets. IDs are never renumbered; a dropped requirement keeps its ID, struck through, with "Dropped" and the date.

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

## 1. Shape of the app

- **[APP-1]** One salesperson, one computer, no sign-in. Light mode only. Designed for screens 1280px wide and up, and usable down to 1024px with no sideways scrolling of the page.
- **[APP-2]** `backend/`: FastAPI serving a JSON API under `/api`, using SQLAlchemy Core (no raw SQL) on a SQLite file at `backend/data/accountable.db`, which git ignores. On start it brings the database up to date with Alembic migrations, and loads the sample data if the database is new, both in one step, so a first start that's cut short is done again by the next one.
- **[APP-3]** `frontend/`: React, TypeScript and Vite. It only talks to `/api`, which Vite passes on to the backend.
- **[APP-4]** No internet connection is needed, and losing it while the app is open changes nothing. Fonts and every library are installed by `npm install` or `uv` and served from this computer; nothing loads from a CDN or Google Fonts.
- **[APP-5]** `npm run dev`, from the repo root, starts the backend on `127.0.0.1:8000` and the frontend on `127.0.0.1:5173`, prints the address, and opens the dashboard in the default browser. Both listen only on this computer, and the backend answers only requests addressed to `127.0.0.1` or `localhost`. If a port is taken, it says so in plain words and stops.
- **[APP-6]** `npm run seed` deletes all data and loads the sample data again. It first asks "모든 데이터를 지우고 샘플 데이터로 되돌릴까요? (y/N)" and does nothing unless the answer is y. `npm run seed -- --yes` skips the question, for scripts.
- **[APP-7]** `npm test` runs every test (Vitest, pytest, Playwright) and fails if any fails. The tests use their own database file and their own ports (8100 and 5273), so they never change real data and can run while `npm run dev` is running.
- **[APP-8]** The commands work the same on Mac, Linux and Windows: npm scripts only, with no shell-specific syntax, and Python started with `uv run`.
- **[APP-9]** `docs/STATUS.md` says how to install, start, reset and test the app. `README.md` is left as it is.
- **[APP-10]** Every change is saved to the database as it's made. It's still there after a browser refresh and after the app is stopped and started.
- **[APP-11]** "Today" is the computer's local date, taken from one backend function. Tests can fix it with the `ACCOUNTABLE_TODAY` environment variable.
- **[APP-12]** No errors or warnings appear in the browser's console on any screen or action.
- **[APP-13]** Code is organized by feature on both sides (organizations, contacts, deals, activities, pipeline, dashboard), each with its own routes, data access and screens. Shared code holds only what two or more features use. Data access stays in each feature's own module, so moving to Supabase later changes those modules and nothing else.
- **[APP-14]** The one-time `npm install` installs everything: the Node packages, and then the Python packages through a `postinstall` script that runs `uv sync`. After that, starting, using, seeding and testing the app need no internet connection.

### Libraries

Mature libraries do these jobs, and none of them is hand-rolled (TECH_STACK.md).

| Job | Library |
| --- | --- |
| Routing | React Router |
| Server data and caching | TanStack Query |
| Tables (sort, search, pages) | TanStack Table |
| Charts | Recharts |
| Drag and drop on the board, including by keyboard | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Dialogs, menus, selects, comboboxes, date picker, checkboxes | React Aria Components, with `I18nProvider locale="ko-KR"` |
| Forms and validation | React Hook Form with Zod |
| Icons | Lucide React |
| Font | `@fontsource/noto-sans-kr` |
| Styles | CSS Modules and CSS custom properties for the brand tokens |
| Running both servers | concurrently |
| Backend | FastAPI, Pydantic, SQLAlchemy Core, Alembic, Uvicorn |
| Tests | Vitest with Testing Library; pytest with FastAPI's TestClient; Playwright Test with `@axe-core/playwright` |

## 2. Data

- **[DATA-1]** Every table has an integer `id`, and `created_at` and `updated_at` timestamps. Money is stored in whole US dollars as an integer. Dates with no time (close date, follow-up date) are stored as ISO dates. Timestamps are stored in UTC and shown in local time.
- **[DATA-2]** SQLite foreign keys are turned on for every connection.

### organizations

**[DATA-3]**

| Field | Type | Rules |
| --- | --- | --- |
| name | text | required, up to 200 characters |
| website | text | optional; `https://` is added if no scheme is given |
| industry | text | optional, free text, with suggestions from the industries already used |
| notes | text | optional, up to 5,000 characters |

### contacts

**[DATA-4]**

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
| occurred_at | timestamp | when it happened; defaults to now; can't be in the future |
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

The rules live in plain backend functions in the feature they belong to, with unit tests, and the API applies them. The frontend doesn't work them out itself, except to update the board's totals the moment a card is dropped (PIPE-8).

1. **[RULE-1] Expected revenue** of a deal is value × probability ÷ 100, rounded to the dollar. Totals add up the rounded figures.
2. **[RULE-2] Open pipeline** means deals in New, Qualified, Proposal and Negotiation. Open totals never include Won or Lost.
3. **[RULE-3] Stage change.** When a deal's stage changes, whether by dragging, the card's menu, the deal form or the deal page, these happen together in one transaction:
   - the probability becomes the new stage's usual probability, unless the same save sets one by hand (the deal form fills in the usual one when its stage is changed, so what's saved is what was on screen);
   - if the new stage is Won or Lost, the close date becomes today, unless the same save sets one by hand;
   - `furthest_open_stage` becomes the new stage if that's an open stage further along;
   - a `stage_change` entry is added to the deal's timeline, shown as "단계 변경: 제안 → 협상";
   - RULE-7 runs.
4. **[RULE-4] Probability by hand.** A probability set in the deal form is kept until the stage next changes.
5. **[RULE-5] Back to open.** A Won or Lost deal can move back to an open stage under RULE-3. It keeps its close date, which may make it late at once, and its contact keeps their status.
6. **[RULE-6] Late.** A deal is late when it's open, has a close date, and that date is before today. Won and Lost deals are never late.
7. **[RULE-7] Won makes a customer.** Whenever a save leaves a deal in Won with a main contact who isn't a customer, that contact becomes a customer, and a `status_change` entry is added to their timeline: "상태 변경: 적격 → 고객 (‘2027 포장재 공급’ 수주)". This covers a deal moved to Won, added straight into Won, or given a new main contact while Won.
8. **[RULE-8] Status changes.** A contact's status is never lowered automatically. A change made by hand in the contact form also adds a `status_change` entry.
9. **[RULE-9] Timelines.** A deal's timeline is its own activities. A contact's timeline is their own activities plus the activities of the deals where they're currently the main contact, each marked with the deal's name. Both are newest first by `occurred_at`.
10. **[RULE-10] Follow-ups.** An activity with a follow-up date that isn't done is a task. It's overdue when the date is before today, due today when it's today, and upcoming when it's later.
11. **[RULE-11] Automatic entries are fixed.** `stage_change` and `status_change` entries can't be edited or deleted by hand. They go only when their record is deleted.
12. **[RULE-12] Won and lost by month.** Deals won and revenue won in a month count deals in Won whose close date falls in that month. Deals lost count the same way.
13. **[RULE-13] Sales funnel.** The deals counted are every open deal plus every deal won or lost with a close date in the last 12 months. A deal counts at an open stage if it's Won or its `furthest_open_stage` is that stage or later, and at Won if it's Won. So a won deal counts at every stage, a deal lost from Proposal counts at New, Qualified and Proposal, and a deal added straight into Proposal counts as having passed New and Qualified. For each stage the funnel shows the total value and number of deals that reached it, and that value as a share of the value at New.
14. **[RULE-14] Board columns.** Open columns show all their deals. The Won and Lost columns show deals whose close date is no earlier than 30 days before today.

## 4. Screens

### 4.1 Shared layout

- **[UI-1]** A navigation bar with the wordmark "Accountable" and the five sections in the intent's order: 대시보드, 거래처, 연락처, 영업 기회, 파이프라인. The current section is marked visually and with `aria-current="page"`. It runs across the top of the page, with no sidebar (6.1).
- **[UI-2]** Each page starts with a header row: the page title, a one-line summary in plain words (for example "연락처 248명 · 고객 61명"), and the page's actions as buttons on the right.
- **[UI-3]** Content sits in white panels on the page background, rounded, with no outline (LOOK-6).
- **[UI-4]** Saving, deleting and moving show a short message that disappears by itself, such as "저장했어요" or "김민준 님이 고객이 되었어요", announced to screen readers.
- **[UI-5]** While data loads, panels show their shape in a muted color instead of a spinner. If the backend can't be reached, a banner says "서버에 연결할 수 없어요. 터미널에서 npm run dev가 실행 중인지 확인해 주세요." and the page retries by itself. If something can't be loaded for another reason, its place says "불러오지 못했어요" with a "다시 시도" button, and no count is shown for it.
- **[UI-6]** An empty table or list says so and offers the obvious next step, such as "아직 거래처가 없어요" with an "거래처 추가" button. A search with no results says "‘한빛’과(와) 일치하는 결과가 없어요".
- **[UI-7]** Every record name shown anywhere (in tables, on cards, in timelines, in the dashboard's lists) links to that record's page.

### 4.2 Dashboard (`/`)

The landing page. Which figures each panel shows is set here; how they're arranged is in 6.1.

- **[DASH-1]** All figures come from one call, `GET /api/dashboard`, so they agree with each other. The dashboard fetches fresh figures every time it's shown, so a deal marked won or a new follow-up shows up straight away.
- **[DASH-2]** Header: the title, today's date ("2026. 11. 23. (월)"), and a summary such as "기한 지난 후속 조치 3건 · 지연된 영업 기회 2건".

Four figures, amounts in bold at a large size:

- **[DASH-3]** **진행 중 파이프라인**: total value of open deals, and how many.
- **[DASH-4]** **예상 매출**: expected revenue of open deals (RULE-1), and its share of the open pipeline.
- **[DASH-5]** **이번 달 수주**: revenue won this month and how many deals, with the change against last month.
- **[DASH-6]** **지연된 영업 기회**: how many late deals and their total value, in Raspberry ink. It links to the Deals table showing only late deals.

Charts:

- **[DASH-7]** **월별 수주 금액** (line chart): revenue won per month for the last 12 months, including this one. Hovering or focusing a month shows the month and amount.
- **[DASH-8]** **월별 수주·실주 건수** (bar chart): deals won and deals lost per month for the same 12 months, side by side, won in Sea Green and lost in Coral, each bar labeled with its count.
- **[DASH-9]** **단계별 파이프라인** (visual of the pipeline): one band across the top panel, under the four figures. Each open stage is a block in its stage color, its width set by the stage's total value, showing the stage name, the number of deals and the total value. A small stage keeps a minimum width so its label still fits. Under each block, a bar shows how much of the stage's value is expected revenue, with the amount ("예상 $48,250"). A line under the band says "칸의 너비는 단계별 금액, 아래 막대는 그중 예상 매출의 비율이에요." Clicking a block opens the Pipeline board.
- **[DASH-10]** **영업 퍼널** (sales funnel): New, Qualified, Proposal, Negotiation and Won as segments that narrow from top to bottom, each width set by the value that reached that stage (RULE-13), with a minimum width so small segments stay readable. Beside each: the value, the number of deals and the share of New. Underneath: "신규 → 수주 전환율 (금액 기준)" with its percentage.
- **[DASH-11]** Each chart has a short text summary for screen readers, and its figures are available as a table (A11Y-6).

Lists:

- **[DASH-12]** **후속 조치**: every overdue follow-up, then those due today, then those due in the next 14 days, soonest first. Each shows the date (overdue ones as "3일 지남" in Raspberry ink), the description, and the contact or deal it's on. A checkbox marks it done, and it leaves the list. A line underneath says how many are due later.
- **[DASH-13]** **최근 활동**: the 10 newest timeline entries of any kind across all records, with the record they're on and when.

### 4.3 Tables (`/organizations`, `/contacts`, `/deals`)

- **[TBL-1]** Each table loads all its rows in one call and searches, sorts and pages them in the browser, 50 rows to a page.
- **[TBL-2]** **Search** narrows the rows as you type. It matches any part of the fields listed below, ignores upper and lower case and extra spaces, and matches phone numbers by their digits alone, so "01012345678" finds "010-1234-5678". It waits until a Korean letter is finished being typed before searching.
- **[TBL-3]** **Sort**: clicking a column heading sorts by it, and clicking again reverses it. The heading shows the direction and has `aria-sort`. Text sorts in Korean order (`Intl.Collator('ko')`), and empty values always go last.
- **[TBL-4]** Each table has an "추가" button that opens the add form, and each row has 수정 and 삭제 in a row menu, which can be reached by keyboard. Clicking a row opens the record's page.
- **[TBL-5]** Columns, search fields and default sort:

| Table | Columns | Search looks in | Default sort |
| --- | --- | --- | --- |
| 거래처 | 이름, 업종, 웹사이트, 연락처 수, 진행 중 영업 기회 (number and value) | name, industry, website | name |
| 연락처 | 이름, 상태, 직책, 거래처, 이메일, 전화번호 | name, email, phone, job title, organization name | name |
| 영업 기회 | 이름, 단계, 거래처, 주 연락처, 금액, 확률, 예상 매출, 마감일 | name, organization name, contact name | close date, soonest first |

- **[TBL-6]** Search, sort, page and filters are kept in the page address.
- **[TBL-7]** Contacts have a status filter above the table: 전체, 리드, 적격, 고객, each with its count.
- **[TBL-8]** Deals have a "지연된 것만" switch. A late deal's row shows a "지연" badge beside its close date, in text as well as color.

### 4.4 Record pages and timelines

- **[REC-1]** **Organization** (`/organizations/:id`): name, industry, website (opens in a new tab), notes; 수정 and 삭제; figures for its open pipeline and its revenue won; its contacts and its deals as short lists, each linking to the record.
- **[REC-2]** **Contact** (`/contacts/:id`): name, status badge, job title, organization link, email (a `mailto:` link) and phone; 수정 and 삭제; the deals where they're the main contact; their timeline (RULE-9).
- **[REC-3]** **Deal** (`/deals/:id`): name, stage, value, probability, expected revenue, close date with the late badge if late, organization and main contact links; a stage selector that moves the deal under RULE-3; 수정 and 삭제; its timeline.
- **[REC-4]** **Timeline**: entries newest first, each with an icon and label for its kind (메모, 통화, 이메일, 단계 변경, 상태 변경), the date and time ("2026. 11. 23. 오후 3:20"), the description, and on a contact's timeline the deal it came from. The first 50 show, with "더 보기" for the rest.
- **[REC-5]** **Logging an activity**: above the timeline, a form with the kind (메모, 통화, 이메일), the description, when it happened (by default, when it's saved) and an optional follow-up date. It's logged on the record whose page it's on.
- **[REC-6]** A note, call or email in the timeline can be edited (kind, description, when, follow-up date, done) and deleted. A follow-up shows its date and a checkbox to mark it done.

### 4.5 Pipeline (`/pipeline`)

- **[PIPE-1]** One column per stage, in order. The header above the board shows the total value and expected revenue of open deals. Each open column's heading shows its stage name, number of deals, total value and expected revenue. The Won and Lost headings show their number of deals and total value, and say "최근 30일".
- **[PIPE-2]** Each card shows the deal's name (up to two lines), its organization, its value, its probability and its close date. A late card shows the "지연" badge and how many days late, in Raspberry ink.
- **[PIPE-3]** Dragging a card to another column changes its stage under RULE-3. Dragging it within a column changes its place. It can be dropped anywhere in a column and stays exactly there, including after a refresh.
- **[PIPE-4]** Each column has an "추가" button that opens the deal form with that stage already chosen. The new deal goes to the top of the column.
- **[PIPE-5]** Clicking a card, or pressing Enter on it, opens the deal's page.
- **[PIPE-6]** A card's place is a number between its neighbors' numbers. The frontend sends the move as the new stage and the cards it now sits between, and the backend works out the number. If two numbers get too close, the backend renumbers that column.
- **[PIPE-7]** At 1280px the six columns fit with no sideways scrolling. On narrower screens the board scrolls sideways inside its own panel, and the page doesn't.
- **[PIPE-8]** A drop shows at once: the card moves, and the board's and the columns' totals change, before the save finishes. If the save fails, the card goes back and a message says "이동하지 못했어요. 다시 시도해 주세요."
- **[PIPE-9]** By keyboard, a focused card can be picked up with Space, moved with the arrow keys between columns and up and down, dropped with Space, and put back with Escape or by pressing the mouse anywhere. Each step is announced in Korean. Each card also has a menu with "단계 이동" (a list of stages), "위로", "아래로", 수정 and 삭제, for anyone who finds the drag keys awkward.

### 4.6 Forms

- **[FORM-1]** Adding and editing happen in a dialog over the current page. Focus moves into the dialog, stays inside it, and goes back where it was when it closes. Escape closes it, but if something has been typed or changed it asks first ("저장하지 않고 닫을까요?", with 계속 입력 and 버리기, and focus on 계속 입력). 취소 and 닫기 close it at once. A click outside doesn't close it.
- **[FORM-2]** Every field has a visible label. Required fields say "(필수)". Messages appear under the field in Korean as soon as the field is left, such as "이름을 입력해 주세요" or "올바른 이메일 주소가 아니에요", and the first wrong field gets focus when saving.
- **[FORM-3]** Organization and contact are picked with a combobox that searches as you type, works by keyboard, and handles 1,000 options.
- **[FORM-4]** In the deal form, choosing a contact who belongs to an organization fills in the organization if it's empty. Changing the stage fills in that stage's probability, and choosing Won or Lost fills in today's close date. Both can still be changed before saving. Going back to the deal's saved stage gives back its probability and close date, and leaving Won or Lost for an open stage gives back the close date from before.
- **[FORM-5]** The value field takes "12500", "12,500" or "$12,500" and shows "$12,500" once you leave it.
- **[FORM-6]** Dates are picked with the React Aria date picker in Korean, showing "2026. 11. 23." whatever language the browser uses.
- **[FORM-7]** Pressing Enter while a Korean letter is still being typed doesn't submit the form.

### 4.7 Deleting

- **[DEL-1]** Deleting always opens a confirmation dialog first. Focus starts on 취소. The delete button is in Raspberry ink with white text.
- **[DEL-2]** The dialog says what will happen to linked records, with counts from `GET /api/<kind>/<id>/delete-impact`:
  - Organization: "‘한빛정밀’을(를) 삭제할까요? 연락처 3명과 영업 기회 2건은 그대로 남고, 거래처 연결만 해제돼요."
  - Contact: "‘김민준’ 님을 삭제할까요? 영업 기회 2건은 그대로 남고 주 연락처가 비워져요. 이 연락처에 기록된 활동 5건은 함께 삭제돼요."
  - Deal: "‘2027 포장재 공급’을(를) 삭제할까요? 이 영업 기회에 기록된 활동 7건(단계 변경 기록 포함)이 함께 삭제돼요."
  - Activity, with its kind: "통화 기록을 삭제할까요?"
- **[DEL-3]** Deleting a record from its own page goes back to its table afterwards.

## 5. API

JSON under `/api`. Amounts are integers, dates are `YYYY-MM-DD`, timestamps are ISO 8601 with time zone. Validation errors return 422 with the field name, and the frontend shows its own Korean message for each field. Every response that lists deals includes `expected_revenue` and `is_late`, worked out by the backend.

- **[API-1]** `GET /api/meta`: stages with their Korean names and probabilities, statuses, activity kinds, the industries in use, and today's date.
- **[API-2]** Organizations: `GET /api/organizations` (with contact counts and open pipeline), `POST`, `GET /{id}` (with its contacts and deals), `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact`.
- **[API-3]** Contacts: `GET /api/contacts`, `POST`, `GET /{id}` (with organization and deals), `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact`, `GET /{id}/timeline?offset=`.
- **[API-4]** Deals: `GET /api/deals`, `POST`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact`, `GET /{id}/timeline?offset=`, and `POST /{id}/move` with `{stage, after_id, before_id}` for the board.
- **[API-5]** Activities: `POST /api/activities` (with `contact_id` or `deal_id`), `PATCH /{id}`, `DELETE /{id}`. Editing or deleting an automatic entry returns 409.
- **[API-6]** `GET /api/pipeline`: the six columns with their cards in order and their totals, and the board's totals (RULE-14).
- **[API-7]** `GET /api/dashboard`: everything in 4.2.
- **[API-8]** `GET /api/health`, for the dev script and the tests to know the backend is ready.
- **[API-9]** The frontend's types for the API are generated from FastAPI's OpenAPI schema with openapi-typescript, so the two sides can't drift apart.

## 6. Look

The brand skill takes priority over general design guidance. The chosen mockup (6.1) settles layout, spacing and detail; where it and these rules disagree, these rules win.

- **[LOOK-1]** One font, bundled from npm (APP-4): Noto Sans KR, weights 400, 500, 600 and 700. It comes in many small pieces, and the browser loads only the pieces for the letters on screen.
- **[LOOK-2]** Everything uses `"Noto Sans KR", sans-serif`: text, headings, amounts, percentages, dates and the Accountable wordmark (bold). One font covers Korean, Latin letters and numbers, so a line never mixes typefaces. Amounts get `font-variant-numeric: tabular-nums` so they line up in tables and figures. No italic anywhere, since Korean fonts have no italic.
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

- **[LOOK-5]** Stage colors, used the same way on the board, the charts, the badges and the funnel: New Sea Green, Qualified Marigold, Proposal Coral, Negotiation Cerulean, Won Midnight (white text), Lost Sea Mist (Midnight text). Raspberry means late or overdue and nothing else. Contact statuses: 리드 Marigold, 적격 Cerulean, 고객 Sea Green.
- **[LOOK-6]** Panels and cards are white, rounded, with no outline. No border on one edge of a panel and no single line across the top of the page. Panels stand out from the page by color alone; a very soft shadow is allowed only on a card being dragged and on dialogs.
- **[LOOK-7]** No gradient fills. The area under the line chart is a flat, light Sea Green.
- **[LOOK-8]** Charts: thin lines and points use ink shades; bars and segments use fills with their value written in Midnight; grid lines are faint Sea Mist; tooltips are Midnight with white text.
- **[LOOK-9]** Keyboard focus shows a 2px Cerulean ink ring with a small gap, on every focusable thing.
- **[LOOK-10]** Icons are Lucide, at one stroke width, always beside a text label or with an accessible name.

### 6.1 Chosen mockup

Chosen on 2026. 11. 23.: **mockup 3, Stage lanes** (`docs/mockups/3-stage-lanes.html`, screenshots `3-stage-lanes-dashboard.png` and `3-stage-lanes-pipeline.png`). The build follows its layout, spacing and detail. Its sample figures are only for the mockup; the real ones come from the API.

Why this one:

- The open pipeline comes first on the dashboard, as one band of stage colors, so it's clear at a glance where the deals stand.
- It looks like a screen for daily work, not a manual.
- Mockup 1, Open ledger, made this month's won revenue the headline. The dashboard then read as a report on wins rather than a review of the whole pipeline.
- Mockup 2, Side desk, with its dark sidebar and dense panels, felt like a manual.

Layout to follow:

- **Top bar**: the wordmark on the left, with a small mark of four rounded blocks in the four open-stage colors. The five sections are a segmented control on a `#E3EAEC` track, with the current one on white. The Midnight "영업 기회 추가" button is on the right.
- **Dashboard**, on a 12-column grid with 22px gaps, in this order:
  1. Full width: the top panel with the four figures (DASH-3 to DASH-6), the open pipeline largest, and the pipeline band under them (DASH-9).
  2. 월별 수주 금액 (7 columns) beside 월별 수주·실주 건수 (5 columns).
  3. 영업 퍼널 as stacked trapezoids, with the figures to their right (5 columns), beside 후속 조치 as one-line rows with the date on the right (7 columns).
  4. Full width: 최근 활동 in two columns.
- **Pipeline**: under the header, a thin band of the open stages with each stage's share of the open value written under it. Then six lanes, each with a light background in its stage's tint, holding white cards. A lane's head has the stage name in its ink shade, a count pill, the total, expected revenue ("최근 30일" for Won and Lost) and, for open stages, a bar for its share of the open value. The "추가" button sits at the top of the lane, above the cards. A late card starts with a "지연 N일" chip (a clock icon, white text on Raspberry ink), and its close date and probability turn Raspberry ink.
- **Sizes**: panels have 26px corners, lanes 22px and cards 14px. Page titles are 32px bold. The open pipeline figure is 40px and the other three figures 28px.

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

**[KO-1]** These words are used everywhere, the same way.

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

- **[KO-2]** Dates: `Intl.DateTimeFormat('ko-KR')`, giving "2026. 11. 23." and "2026. 1. 5.". With a weekday: "2026. 11. 23. (월)". With a time: "2026. 11. 23. 오후 3:20".
- **[KO-3]** Chart months: "12월", and "2026년 1월" for January and for the first month on an axis. The bar chart leaves the first month's year out when January comes next, since the two years would run into each other.
- **[KO-4]** Amounts: US dollars, whole, with commas: "$12,500". Chart axes may shorten them to "$120K" and "$1.2M"; everywhere else they're written in full.
- **[KO-5]** Counts take the right counter word: "3건" for deals, activities and follow-ups, "5명" for contacts, "4곳" for organizations.
- **[KO-6]** Particles after a name that may end in a vowel or a consonant are written both ways, as in "을(를)" and "과(와)", unless the code works out the right one.
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
- **[A11Y-7]** An automated accessibility check (axe) finds no WCAG 2.1 AA violations on any screen, with and without a dialog open (TEST-4).

## 9. Speed

With about 1,000 organizations, 1,000 contacts, 1,000 deals and 1,000 activities, measured on the test machine:

- **[PERF-1]** Each screen is ready within 1 second of being opened.
- **[PERF-2]** A table updates within 200 ms of a key being typed in search or a heading being clicked.
- **[PERF-3]** On the board, a card follows the pointer smoothly while dragged, and the totals change within 200 ms of the drop.
- **[PERF-4]** `GET /api/dashboard` and `GET /api/pipeline` answer within 300 ms. Indexes cover the fields they filter and sort by (stage, close date, follow-up date and done, the foreign keys).

## 10. Sample data

- **[SEED-1]** Loaded when the database is new and by `npm run seed`. It's the same every time apart from its dates, which are set relative to today, so every screen looks alive whenever it's loaded.
- **[SEED-2]** The story: a Korean exporter of industrial parts and packaging, with customers at home and abroad. About 25 organizations, half Korean and half overseas (Japan, the US, Germany, Vietnam, Australia and others), across industries such as 제조, 식품, 화장품, 물류, 유통, 의료기기 and IT. Every name is made up; no real companies or people.
- **[SEED-3]** About 70 contacts with Korean or overseas names to match their organization, at every status, with some having no organization.
- **[SEED-4]** About 80 deals at every stage, valued from $2,000 to $250,000: won and lost deals spread across the past 12 months, so both monthly charts are filled; at least two won and one lost in the last 30 days, so those columns aren't empty; open deals closing over the next months; three or four late; and a few with no organization or contact.
- **[SEED-5]** About 250 activities: notes, calls and emails across contacts and deals over the past months; a stage-change entry for each step each deal took, consistent with its `furthest_open_stage`; a status-change entry for each customer; and follow-ups, with three or four overdue, one due today and five or six due in the next two weeks.
- **[SEED-6]** A separate test helper loads about 1,000 of each kind of record into the test database, for the speed tests (PERF). It isn't part of `npm run seed`.

## 11. Tests

`docs/plan.md` maps each requirement to the tests that prove it. In outline:

- **[TEST-1]** pytest: every rule in section 3, every API endpoint including validation and delete effects, the seed's shape, and a run of `npm run seed -- --yes` twice in a row.
- **[TEST-2]** Vitest: formatting (dates, amounts, counter words), search normalization, sorting in Korean order, the optimistic board totals, and form validation.
- **[TEST-3]** Playwright, in installed Chrome, against servers and a database of its own: each success criterion from the intent as a user would do it, including drag and drop with the mouse and with the keyboard, a refresh after each change, and a restart of the backend.
- **[TEST-4]** Playwright with axe on every screen (A11Y-7), and a check that the console has no errors (APP-12).
- **[TEST-5]** Playwright with the 1,000-record database for PERF-1 to PERF-4.

## 12. Success criteria and where they're covered

| Intent success criterion | Covered by |
| --- | --- |
| 1. Install, start, land on the dashboard with sample data | APP-5, APP-6, APP-9, SEED |
| 2. Add, search, sort, edit, delete; kept after refresh and restart; reset | TBL, FORM, DEL, APP-10, APP-6, RULE-3 to RULE-8 |
| 3. Status filter; linked records on each page | TBL-7, REC-1 to REC-3 |
| 4. Pipeline drag, probability, place kept, totals, add in column, late, Won/Lost, close date, customer | PIPE, RULE-3 to RULE-7, RULE-14 |
| 5. Timelines, stage-change entries, contact sees deal history, follow-ups | REC-4 to REC-6, RULE-9, RULE-10, DASH-12 |
| 6. Dashboard figures match and update | DASH-1, RULE-1, RULE-2, RULE-12, RULE-13 |
| 7. Sharp and on-brand, Korean, Korean dates, dollars, Noto Sans KR, charts | LOOK, KO, DASH-7 to DASH-10 |
| 8. Keyboard, contrast, labels | A11Y, PIPE-9, LOOK-4 |
| 9. Quick with about 1,000 records | PERF |
| 10. Used end to end in a real browser, console clean | TEST-3, TEST-4, and a person using it by hand before it's called done |

## 13. Later

Not in the MVP, and kept possible by how it's built:

- Sign-in, several users and a record of who did what (the intent's open questions): data access sits in one module per feature (APP-13), so adding a user to each change, and moving to Supabase's database, changes those modules.
- Use beyond this computer: the backend only listens on `127.0.0.1` for now (APP-5). Deploying to Render later changes that, together with sign-in.
- Dark mode: colors are already tokens (LOOK-3), and the brand's dark surfaces can be added as a second set.
