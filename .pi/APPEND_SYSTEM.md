## ⛔ Hard Rule #0 — permission before anything slow

Never run, without the user's explicit permission **in their current message**:
e2e/end-to-end anything (`playwright test`, dev server, launching the app,
screenshots, DOM dumps), writing an e2e spec and then running it to "check", or
any command likely to exceed ~10 seconds (`vite build`, `cargo build`, installs,
migrations, whole-suite reruns, `git log --follow`).

**Do the asked thing, then stop.** If a check would help, write one line —
"want me to run X (~7 s)?" — and wait. Silence is not permission. A past yes is
not permission for next time. "No need to run e2e" is not permission for anything.

Allowed without asking: `tsc --noEmit`, `eslint <paths>`, `bun test <paths>`,
`git status/diff/add/commit/log -n`, reading files, grep.
If something stays unverified, say so in the report — do not verify it yourself.

A `tool_call` gate (`.pi/extensions/guard-slow.ts`) enforces this: those commands
are blocked unless the file `.pi/allow-slow` exists.

