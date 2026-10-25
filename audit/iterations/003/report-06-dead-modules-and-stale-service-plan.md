---
slug: dead-modules-and-stale-service-plan
title: "Six unimported modules and a 450-line stale PLAN.md still describe the deleted legacy architecture"
severity: low
category: maintainability
iteration: 3
created: 2026-10-21T18:48:19.084Z
files:
  - "src/lib/result.ts"
  - "src/lib/cache-factory.ts"
  - "src/lib/response.ts"
  - "src/lib/validate.ts"
  - "src/components/Notification.tsx"
  - "src/hooks/use-submit.ts"
  - "src/services/PLAN.md"
  - "src/route.tsx"
  - ".agent/agent.md"
---

# Six unimported modules and a 450-line stale PLAN.md still describe the deleted legacy architecture

- **Severity:** low
- **Category:** maintainability
- **Files:** `src/lib/result.ts`, `src/lib/cache-factory.ts`, `src/lib/response.ts`, `src/lib/validate.ts`, `src/components/Notification.tsx`, `src/hooks/use-submit.ts`, `src/services/PLAN.md`, `src/route.tsx`, `.agent/agent.md`
- **Iteration:** 3

## Summary

Six modules have no importer at all — including `src/lib/result.ts`, a 146-line global mutable query cache that `.agent/agent.md` still documents as the project's "primary data pattern" and that `.pi/skills/services.md` says was removed. Alongside them, `src/services/PLAN.md` (450 lines, living inside the folder it describes) still claims `src/pages/{Shop,Analytics,Stock-PENDING,Setting/Sync_PENDING}` and `src/lib/sync` import `~/database` — all deleted in iteration 1 — and `src/route.tsx` carries two commented imports plus two commented route entries for those same deleted pages.

## Details

## Evidence

`tsc` and `eslint` are clean, and neither flag unused modules — so the following is invisible to CI and rots quietly. Verified with `rg` against `src/` on HEAD (no importer found for any of them):

| File | Lines | What it is |
|---|---|---|
| `src/lib/result.ts` | 146 | the legacy `Result.use` + module-level global query cache (`const cache: Map<string, Query> = new Map();`), superseded by `useStream`/`useQuery` in `components/Loader.tsx` |
| `src/lib/cache-factory.ts` | 62 | `CacheItem` entity cache, superseded by the services |
| `src/lib/response.ts` | 49 | legacy response helpers |
| `src/lib/validate.ts` | 20 | legacy form validator |
| `src/components/Notification.tsx` | 10 | one-off panel, no importer |
| `src/hooks/use-submit.ts` | 58 | `useSubmit`, superseded by `useMutation` |

`src/lib/result.ts` is the dangerous one: it is a *second*, global, mutable caching model that looks authoritative, is documented in `.agent/agent.md` ("`Result.use` + `Result.match` — Primary data pattern"), and is contradicted by `.pi/skills/services.md` ("not all pages are migrated yet — … `Loader-old` have been removed"). A contributor (or an agent) reading `agent.md` will follow it and reintroduce the exact bug the first two audits were about (a second source of truth that is never invalidated).

Same root cause, docs half:

* `src/services/PLAN.md` (450 lines) is stale in a way that will mislead. It states:
  > `| src/database/* | deleted; only src/lib/sync/*, ~/hooks, Analytics, Shop and Stock-PENDING still import it |`
  > `| src/lib/result.ts | legacy Result.use hook; only Analytics, Shop, Stock-PENDING and Setting/Sync_PENDING use it |`

  Every one of those directories was deleted in iteration 1 (`src/lib/sync/`, `src/pages/Shop/`, `src/pages/Analytics/`, `src/pages/Stock-PENDING/`, `src/pages/Setting/Sync_PENDING/`), and `src/lib/result.ts` has *zero* consumers. The plan also says `src/transaction` (tx.db) "stays as-is", which no longer describes the tree.
* `src/route.tsx` still carries commented-out imports and route entries:
  ```tsx
  // import { shopRoute } from "./pages/Shop";
  ...
  // import { analRoute } from "./pages/Analytics";
  ...
            // shopRoute,
            // analRoute,
  ```
  Both target modules are gone, so the lines are pure noise in the file that defines the app's navigation.

## Why it matters

* **It re-teaches a superseded pattern.** `Result.use`'s global `Map` cache is precisely the "second source of truth, never invalidated" shape that `stale-listing-cache` (iteration 1, high) was filed about, and it is still presented in `.agent/agent.md` as the primary data pattern. Dead code that contradicts the live architecture is worse than neutral.
* **Audit-budget tax.** Each of these files is a candidate for a future reader to open, trust, and build on. 345 lines plus a 450-line stale plan is a meaningful share of a `src/` that is otherwise ~35 k lines.
* **The plan doc is the on-ramp.** `src/services/PLAN.md` is inside the services folder it documents, at 450 lines, and its "current state" table is wrong on four rows. It is the first thing a new contributor reads when touching the service layer.
* Recurring: iteration 2 already noted `src/services/PLAN.md` as stale and the commented routes as nits; both are still present.

## Recommended fix

1. `git rm` the six dead modules (`src/lib/{result,cache-factory,response,validate}.ts`, `src/components/Notification.tsx`, `src/hooks/use-submit.ts`). `tsc` will confirm nothing referenced them.
2. Delete the two commented imports and two commented route entries in `src/route.tsx`; the history is in git.
3. Either delete `src/services/PLAN.md` (the work it plans is done) or move the still-true parts into `docs/` and rewrite the "current state" table to match HEAD. Preferred: delete it — `specification.xml` and `.pi/skills/services.md` are the durable documents, and a plan that is 100 % complete is noise.
4. Update `.agent/agent.md`'s "Data Fetching & State" section: remove the `Result.use` / `CacheItem` guidance and point at `useStream`/`useMutation` + `Loader`/`LoaderMany` (it currently documents a pattern that no shipping file uses).
5. Add a cheap CI guard so unused modules are caught mechanically rather than by audit: `knip` or `ts-prune` on `src/`, or an ESLint `no-restricted-imports` allowlist. Even a `bun test` that asserts every file under `src/lib` is imported by at least one other file would have caught all six.

## Acceptance criteria

- None of the six listed modules exists, or each has at least one importer.
- `rg "lib/result|lib/cache-factory|lib/validate|lib/response|useSubmit" src` returns nothing.
- `rg "// import|// shopRoute|// analRoute" src/route.tsx` returns nothing.
- `src/services/PLAN.md` is gone, or its "current state" table matches `ls src/pages` and `ls src/lib` at HEAD.
- `.agent/agent.md` no longer documents `Result.use` as the primary data pattern; it points at `services.md`.
- A dead-export/dead-module check runs in CI (or is at least documented as a manual step in `CONTRIBUTING`-equivalent docs).

## Verification

- `bun run typecheck && bun run lint && bun test` after each removal (`tsc` is the proof of no importers; `noUnusedLocals` is on).
- `bun run build` still produces `dist/` (ensures nothing was reaching these files through a dynamic import).
- If `knip` is added: run it before and after; the before-run should list exactly these six files (plus the known test-only helpers), the after-run should be empty.
