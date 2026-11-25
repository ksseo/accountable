# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

Read `docs/spec.md` first. It describes the whole product as it stands today.

- `docs/TECH_STACK.md`: the stack
- `docs/STANDARDS.md`: how we write code here
- `docs/STATUS.md`: what's done so far
- `docs/changes/<branch name>/`: one folder for each change, with its `intent.md` and `plan.md`. Read only the current change's folder, the one named after the branch you're on. The others are history

Run `npm run check` before you finish a change. It runs the formatting, lint, type and secret checks and every unit and end-to-end test, fails if any fail, and takes about 9 minutes. While you work, `npm run check:quick` leaves out the end-to-end tests and takes under a minute, and `npm run format` fixes the formatting

Fix what the checks find. Don't loosen a rule or switch one off for a line without asking first

Each thing a change adds to `docs/spec.md` needs a test that has been seen to fail without it, or a line under "Checks by hand" in `docs/STATUS.md`

Before you say a check passed, make sure it checked something: it ran on the right file or screen, and it can fail

Update `docs/STATUS.md` when you finish a piece of work

At Deploy, after the review fixes and before the merge, follow `docs/IMPROVE.md`
