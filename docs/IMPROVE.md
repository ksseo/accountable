# Improve the harness

Run this at Deploy, after the review fixes and before the merge. If an Important finding is still open, say so before you start.

1. List what went wrong on this change, each with its cause: the review's findings, what the person corrected, what the checks caught and what was found by eye. Other sessions may have built and tested it, so read this change's entries in `docs/STATUS.md` and its commits too.
2. Compare the list with "Seen once" below and with the earlier entries in `docs/STATUS.md`. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead, and put the old mistakes back to see it fail. Add a mistake made for the first time to "Seen once", and take off one that now has a correction or a check.
3. Remove anything out of date. Look for files that are named but gone, figures that have changed, such as how long `npm run check` takes, and corrections that a check now makes unnecessary.
4. Run `npm run check`, and update `docs/STATUS.md` with what changed here and with the findings that are still open.
5. Improve this file, so that the next round makes a better change. Keep this as the last step.

## Seen once

- Dark mode: a transition meant for hover also ran when something else changed the color, so a change that should have been instant wasn't.
- Dark mode: Playwright reads `test.use({ option: [a, b] })` as `[value, options]`, so a list of two doesn't arrive as a list.
- Dark mode: `page.route('**/api/**')` also blocks the app's own modules in `/src/api/`, so nothing is on the page.
- Dark mode: a check that reads source text (`tokens.test.ts`) missed ways of writing a color that it hadn't been tried on.
