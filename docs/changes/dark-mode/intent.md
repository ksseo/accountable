# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section.

## Constraints

- Light mode stays the default, and the app remembers the choice.
- The choice is kept in the browser (localStorage), with no API or database change. It survives a restart of the app and `npm run seed`. Each browser and each address (`127.0.0.1` and `localhost`) remembers its own.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets the same contrast rules as spec.md.
- Panels are black in dark mode, as the brand says, and Midnight on black is only 1.74:1. So whatever has a Midnight fill in light mode (the Won stage, "영업 기회 추가", messages, chart tooltips) has a Sea Mist fill with Midnight text in dark mode, and the Lost stage becomes a dark slate. The other stage colors are the same in both modes.
- Charts, dialogs and messages follow the mode too.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
4. The accessibility tests (axe) check every screen and dialog they cover today in dark mode as well as in light mode, and find no violations.
5. Light mode screenshots of each screen from before and after the change, compared once for this change, differ only by the toggle. The comparison isn't kept as a test.
