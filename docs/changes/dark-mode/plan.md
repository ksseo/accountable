# Plan: dark mode

This plan builds the dark mode that `docs/spec.md` describes, for the intent in `docs/changes/dark-mode/intent.md`. Requirement IDs (UI-9, LOOK-11 and so on) are the spec's.

Each phase ends with `npm run check:quick` passing, and with the end-to-end tests it names. A phase doesn't start while the one before it has a failing test. The end of each phase is a good point to commit; the build session doesn't commit. If a phase finds the spec wrong or unclear, the spec is fixed first, then the code.

## Files that change

Only the frontend, the end-to-end tests and the docs change. There's no change to the backend, the API, the database or the scripts, and no new dependency: the toggle is React Aria's `ToggleButton`, its icons are Lucide's, and the tests use what's already installed.

### Colors: `frontend/src/styles/`

| File | Change |
| --- | --- |
| `tokens.css` | One name per job, then the dark values (tables below). LOOK-3, LOOK-4, LOOK-5, LOOK-11 |
| `global.css` | Body text uses `--text` |
| `tokens.test.ts` (new) | Keeps colors in one place (Proof) |

Brand colors keep their names and have one value. These names are new:

| Name | Job | Replaces, in light mode |
| --- | --- | --- |
| `--text` | body text, and the hover outline of a checkbox | `--midnight` in 26 places |
| `--strong`, `--on-strong`, `--strong-hover` | main buttons, messages, chart tooltips, the chosen day, the Won stage | `--midnight` with `#fff`, `#0b4a5e` |
| `--cerulean-deep`, `--raspberry-deep`, `--raspberry-deep-hover`, `--on-deep` | fills with small white text, the same in both modes | `--cerulean-ink` and `--raspberry-ink` as a fill, `#a91f42`, `#fff` |
| `--check-fill`, `--check-mark` | a ticked checkbox | `--sea-green-ink`, `#fff` |
| `--raised` | dialogs, a card being dragged | `--panel` |
| `--popover` | menus, lists, the calendar | `--panel` |
| `--hover` | a table row or a plain button under the pointer | `#f7fafa` |
| `--grid-line` | chart grid lines, with their opacity | `--sea-mist` at 0.55 |
| `--lane-bar`, `--lane-button` | a lane's share bar and its "추가" button | white at 85% and 70% |
| `--scroll-thumb`, `--veil`, `--switch-thumb` | a lane's scrollbar, behind a dialog, a switch's knob | Midnight at 20% and 32%, `#fff` |

`--midnight` stays for the text on bright fills only: the Lead and Customer badges, and the names `--stage-new-on`, `--stage-qualified-on` and `--stage-proposal-on`.

### Components: `frontend/src/`

These change color names only, not layout or behavior, unless the table says so.

| File | Change |
| --- | --- |
| `app/Layout.tsx`, `app/Layout.module.css` | The toggle goes left of "영업 기회 추가". The mark's four blocks use the brand tokens. Body text |
| `app/Toasts.module.css`, `app/ConnectionBanner.module.css` | Strong fill; a failure is deep Raspberry with `--on-deep`, set on both its fill and its text |
| `crm/badges.tsx` | Deep fills for 적격 and 지연 |
| `crm/dashboard/Dashboard.module.css`, `chartParts.tsx`, `WonRevenueChart.tsx`, `WonLostChart.tsx` | Text, tooltip, grid lines; a point's center uses `--panel`; bar counts use `--text` |
| `crm/pipeline/Board.module.css` | Text, lane bar, lane button, scrollbar, late chip; `.lifted` gets `--raised` |
| `crm/tables.module.css`, `crm/activities/Activities.module.css` | Text; the switch's deep fill and knob |
| `ui/Button.tsx`, `ui/Button.module.css` | Colors. The variants `dark` and `white` become `strong` and `plain`, since neither name is true in dark mode |
| `crm/activities/ActivityForm.tsx`, `crm/contacts/ContactForm.tsx`, `crm/contacts/ContactsPage.tsx`, `crm/deals/DealForm.tsx`, `crm/deals/DealsPage.tsx`, `crm/organizations/OrganizationForm.tsx`, `crm/organizations/OrganizationsPage.tsx` | The variant's new name |
| `ui/Checkbox.module.css`, `ui/ChartPanel.module.css`, `ui/DataTable/DataTable.module.css`, `ui/Panel.module.css` | Text, check fill, hover |
| `ui/DatePicker.module.css`, `ui/Dialog.module.css`, `ui/RowMenu.module.css`, `ui/Select.module.css` | Floating backgrounds, veil, chosen day, focused part of a date. `ui/Combobox.tsx` uses `Select.module.css`, so it follows |
| `ui/ConfirmDelete.tsx`, `ui/ConfirmDelete.test.tsx` | The comment, and the test that names the color: DEL-1 now says deep Raspberry |

### The mode: `frontend/`

| File | Change |
| --- | --- |
| `index.html` | A short script in `<head>` reads the choice and sets `data-mode="dark"` on `<html>` before anything is drawn. `tokens.css` and `global.css` are linked here |
| `src/main.tsx` | No longer imports those two files |
| `src/app/mode.ts` (new) | Reads the mode from `<html>`, switches it, and keeps it in `localStorage` under `accountable.mode`. A plain store read with `useSyncExternalStore`, as `toastStore.ts` is |
| `src/app/mode.test.ts` (new) | Proof |
| `src/app/ModeToggle.tsx`, `ModeToggle.module.css`, `ModeToggle.test.tsx` (new) | The icon button named "다크 모드" (UI-9) |

### End-to-end tests: `e2e/`

| File | Change |
| --- | --- |
| `support/fixtures.ts` | A `mode` option, `light` unless a test says otherwise, that sets the choice before the page loads |
| `support/contrast.ts` (new) | The contrast of a piece of text with what's drawn behind it |
| `a11y.spec.ts` | Every check in both modes, plus the charts' text |
| `dark-mode.spec.ts` (new) | Proof |

### Docs

| File | Change |
| --- | --- |
| `docs/spec.md` | Section 11: rows for the two new Vitest areas (`app/`, `styles/`) |
| `docs/STATUS.md` | What was done, and the checks by hand |
| `docs/changes/dark-mode/` | `dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png`, `pipeline-dark.png` |

### Decided against

- **A library for themes.** One attribute and one stored word don't need one.
- **`prefers-color-scheme` or CSS `light-dark()`.** The device's setting isn't followed (UI-9), and a second block of values is easier to read beside the first.
- **A React context for the mode.** Colors follow from CSS alone, so only the toggle needs to know the mode.
- **Screenshot tests kept in the repo.** The intent says the comparison is done once. Fonts draw differently on CI's Linux, so kept pictures would fail there.

## Order of work

### Phase 1: Light mode before the change

No code changes yet. A one-off script, kept outside the repo, starts a copy of the app with its own database and ports (`ACCOUNTABLE_DB`, `ACCOUNTABLE_API_PORT`, `ACCOUNTABLE_WEB_PORT`), today fixed with `ACCOUNTABLE_TODAY=2026-11-23`, the browser's clock fixed to 10:00 that day, and reduced motion. It takes light mode at 1440px wide, and the top bar also at 1280px and 1024px:

- the dashboard, also with its charts as tables and with a chart's tooltip showing;
- the three tables, the deals table with only late deals, and a row under the pointer;
- the pipeline, also with a card menu open and with a card being dragged;
- an organization, a contact and a deal, a record that isn't there, and an unknown address;
- the add deal dialog, also with its calendar and its stage list open; the delete question; a message, and one that failed.

It runs twice. The two sets must be identical, pixel for pixel, before they count as the "before" set; anything that differs is made steady first. The database is kept and not reseeded, so the "after" set has the same data. Pixels are compared on a canvas in the browser, so no image library is needed.

Done when: two runs match, and the "before" set and its database are kept.

### Phase 2: One name per job, light mode only

1. `tokens.test.ts` first, seen to fail on the 28 lines outside `tokens.css` that have a color of their own.
2. The new names in `tokens.css`, with the values light mode has today.
3. Every use of `--midnight`, of an ink shade as a fill, and of a color of its own moves to the name for its job, following the tables above. The button variants are renamed.
4. `ConfirmDelete.test.tsx` follows DEL-1.

Done when: `npm run check:quick` passes and the light pictures match the "before" set exactly. The toggle isn't there yet, so nothing at all may differ.

### Phase 3: The dark values

1. The second set of values in `tokens.css`, under `:root[data-mode='dark']`, from spec 6.2 and LOOK-5, with `color-scheme: dark`.
2. Look at every screen and state in Phase 1's list with `data-mode="dark"` set by hand, and fix what's wrong.

Done when: every one has been looked at in dark mode, and light mode still matches the "before" set exactly.

### Phase 4: The toggle

1. `mode.test.ts` and `ModeToggle.test.tsx`, then `mode.ts` and `ModeToggle.tsx`, then the toggle in the top bar.
2. `index.html`: the script and the two stylesheet links; `main.tsx` without the two imports.
3. `dark-mode.spec.ts` and the `mode` option in the fixtures.

Done when: `dark-mode.spec.ts`, `smoke.spec.ts`, `keyboard.spec.ts` and `layout.spec.ts` pass, and light mode matches the "before" set outside the toggle's box.

### Phase 5: Accessibility in both modes

1. `a11y.spec.ts` runs each of its checks in both modes.
2. `contrast.ts` and the check on the charts' text. It's seen to fail with a chart text color made too dark.
3. Fix what they find. A color that changes is changed in the spec first, with its contrast figures worked out again.

Done when: `a11y.spec.ts` passes.

### Phase 6: Proof of the whole change

1. The "after" set of light mode against the "before" set: the only difference is inside the toggle's box.
2. The four pictures in `docs/changes/dark-mode/`, from the same data and fixed time.
3. `docs/spec.md` section 11 and `docs/STATUS.md`.
4. `npm run check`.

Done when: every success criterion in the intent is met.

## Risks

| Risk | What we do about it |
| --- | --- |
| Light mode changes by mistake while about 80 lines move to new names | Phase 2 changes names and no values, and nothing else. The pictures must match exactly before Phase 3 starts |
| A use gets the wrong name. In light mode `--text`, `--strong` and `--midnight` are the same color, so it only shows in dark mode, as Sea Mist text on Sea Green | axe finds it in HTML, the chart check finds it in SVG, and Phase 3 looks at every screen |
| axe can't judge text in SVG. Tried: bad SVG text comes back as "incomplete", and our tests only look at violations | `contrast.ts` works it out from the text's fill and everything drawn behind it, including the faint area under the line |
| axe doesn't check what isn't text (focus ring, field outlines, lane edges), or a state it isn't shown (hover, dragging) | Looked at in Phase 3. The figures that matter are in LOOK-12 |
| A dark page shows white first. Vite sends CSS that's imported from JavaScript only after the page has been drawn | The two stylesheets are linked in `index.html`, which the browser waits for. Tried: Vite serves `tokens.css` to a link as plain CSS. A test holds back `main.tsx` and checks the background |
| Linking them changes the order of the CSS | They were the first imports after the fonts, and links come first in the page, so the order stays. The Phase 4 pictures would show a difference |
| The script in `index.html` and `mode.ts` each name the stored key | Two lines of the same word. The reload test fails if they drift apart |
| `localStorage` throws or is off | Both places read and write it inside try and catch. A test makes it throw, and the console must stay clean (APP-12) |
| Dialogs, menus and the dragged card are drawn outside the app's own element | The attribute is on `<html>`, so they follow too. `dark-mode.spec.ts` checks one of each |
| Recharts keeps the color it first drew with | It writes `var(--name)` into the SVG, which the browser works out again. Tried in the design preview, and a test switches with the chart on screen |
| The pictures differ from run to run because of dates, the clock or animation | The same database, a fixed date and time, reduced motion, and two runs that must match first |
| The "before" pictures are lost | They can be taken again from `main` in a git worktree |
| `npm run check` gets slower | `a11y.spec.ts` takes 35 seconds today and about 31 more in both modes; `dark-mode.spec.ts` should add under a minute. The check takes about 8 minutes now |
| The toggle moves the top bar at 1024px | Measured: 213px are free between the nav and the button, and the toggle needs 50. `layout.spec.ts` covers the widths |

## Proof

### Unit tests (Vitest, beside each module)

| File | Proves | IDs |
| --- | --- | --- |
| `styles/tokens.test.ts` | No stylesheet or component outside `tokens.css` has a color of its own. Nothing outside it asks for `data-mode`, apart from `mode.ts` and `index.html`. Every dark name exists in light mode. The seven brand colors have no dark value | LOOK-3 |
| `app/mode.test.ts` | Light unless `<html>` says dark. Switching changes `<html>` and what's kept. Switching still works when `localStorage` throws. Whoever listens is told | UI-9 |
| `app/ModeToggle.test.tsx` | A button named "다크 모드", not pressed in light mode and pressed in dark mode; pressing it switches, by mouse and by keyboard | UI-9, A11Y-1, A11Y-3 |
| `ui/ConfirmDelete.test.tsx` (changed) | The delete button is deep Raspberry with white text, and has no dark value | DEL-1 |

The existing unit tests stay as they are.

### End-to-end tests (Playwright)

| File | Test | IDs |
| --- | --- | --- |
| `dark-mode.spec.ts` (new) | Light is the default, even when the device prefers dark | UI-9, SC 11 |
| | The toggle turns dark mode on and off; it's on every section, on a record page and on an unknown address; a reload keeps the mode (success criterion 2) | UI-9, SC 11 |
| | The choice is kept after `npm run seed` and after the backend restarts | UI-9 |
| | A tab that's already open keeps its mode until it's reloaded | UI-9 |
| | A dark page has the dark background before the app's code has run | UI-9 |
| | Typed text, the address and the scroll stay when switching, and no message shows | UI-9 |
| | With `localStorage` throwing, the toggle works, a reload goes back to light, and the console is clean | UI-9, APP-12 |
| | A chart already on screen, its tooltip, a dialog, a menu, a list, the calendar, a card being dragged, a message and one that failed all have their dark colors | LOOK-5, LOOK-6, LOOK-8, LOOK-11, SC 11 |
| | The toggle is reached with Tab and pressed with Space | A11Y-1 |
| `a11y.spec.ts` (changed) | All four tests there today, in light and in dark mode (success criterion 4) | A11Y-2, A11Y-3, A11Y-7, LOOK-4, LOOK-12, SC 8, SC 11 |
| | All the text in the dashboard's charts reaches 4.5:1 with what's behind it, in light and in dark mode (success criterion 4) | LOOK-4, LOOK-12, TEST-4 |

These existing tests cover the rest, unchanged: `layout.spec.ts` that nothing scrolls sideways with the toggle in the top bar, `smoke.spec.ts` the top bar and the fonts, and `keyboard.spec.ts` the tab order, which goes by target and not by count. The speed tests (PERF) run as part of `npm run check`.

### Proof that isn't kept as a test

| Success criterion | How |
| --- | --- |
| 1 | `npm run check` in Phase 6, with its output |
| 3 | The four pictures in `docs/changes/dark-mode/` |
| 5 | The light pictures before and after, compared pixel for pixel in Phases 2, 3, 4 and 6. The result, with the size and place of the one difference, goes in `docs/STATUS.md` |

### Checks by hand

These need a person and go in `docs/STATUS.md`:

- Each screen looked at in dark mode, in Chrome, as a salesperson would use it, with the console open.
- The focus ring, hover colors, field outlines and lane edges, by eye, in dark mode.
- Reloading and opening the app in dark mode, watching for a flash of white.
