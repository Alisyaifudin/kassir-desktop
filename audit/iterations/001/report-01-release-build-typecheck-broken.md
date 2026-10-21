---
slug: release-build-typecheck-broken
title: "`bun run build` fails: typecheck gates the release build and does not pass"
severity: critical
category: tooling
iteration: 1
created: 2026-10-21T17:29:45.048Z
files:
  - "package.json"
  - "src-tauri/tauri.conf.json"
  - "tsconfig.json"
  - ".github/workflows/windows-release.yml"
  - "src/components/createErrorBoundary.tsx"
  - "src/lib/receipt/build-header.ts"
  - "src/pages/Home/z-NavGrid.tsx"
---

# `bun run build` fails: typecheck gates the release build and does not pass

- **Severity:** critical
- **Category:** tooling
- **Files:** `package.json`, `src-tauri/tauri.conf.json`, `tsconfig.json`, `.github/workflows/windows-release.yml`, `src/components/createErrorBoundary.tsx`, `src/lib/receipt/build-header.ts`, `src/pages/Home/z-NavGrid.tsx`
- **Iteration:** 1

## Summary

`package.json` defines `build` as `tsc && vite build` and Tauri runs it as `beforeBuildCommand`, but `tsc` exits 2 on the current tree — including errors in shipped code (`createErrorBoundary.tsx`, `receipt/build-header.ts`, `Home/z-NavGrid.tsx`). A clean `tauri build` / CI release therefore cannot produce the MSI, and the type errors that would have caught the credit-receipt crash are being ignored.

## Details

## Evidence

`package.json`:

```json
"build": "tsc && vite build",
```

`src-tauri/tauri.conf.json`:

```json
"beforeBuildCommand": "bun run build",
```

Running the exact command the build gate runs:

```
$ npx tsc --noEmit -p tsconfig.json --pretty false
exit 2
src/components/createErrorBoundary.tsx(49,41): error TS2358: The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter.
src/components/createErrorBoundary.tsx(63,3): error TS2322: Type 'ComponentType<ErrorBoundaryProps<InstanceType<new (...args: never[]) => E>>>' is not assignable …
src/lib/receipt/build-header.ts(31,31): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
src/lib/receipt/build-header.ts(31,75): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
src/pages/Home/z-NavGrid.tsx(2,3): error TS6133: 'Store' is declared but its value is never read.
…
```

The bulk of the output is the dead legacy trees (`src/lib/sync/**`, `src/pages/Shop/**`, `src/pages/Analytics/**`, `src/pages/Setting/Sync_PENDING/**`, `src/hooks/use-get-products.ts`) importing modules that no longer exist (`~/database`, `~/store`, `~/server`, `~/transaction`, `~/middleware/admin`). Those are reported separately; the point here is that **live** files also fail.

`createErrorBoundary.tsx:22-27` types the factory over `InstanceType<Classes[number]>` and then returns a class component whose props are a *different* type variable (`E`), which TS rejects; `ErrorClass` at line 49 is a `AnyErrorConstructor` (`new (...args: never[]) => Error`), which is not a valid `instanceof` right-hand side under this configuration. This is a shared boundary component used by `Login`, `Record/Item`, and the POS (`src/pages/Pos/z-Complete.tsx` path).

`build-header.ts:31` passes `record.paidAt` (typed `number | null` in `src/services/record/index.ts:97`) into `formatDate(epochMilli: number, …)` / `formatTime(…)`. The compiler flags a real bug (see the credit-receipt report), and because the build is red nobody is reading the error.

`.github/workflows/windows-release.yml` has no `typecheck`, `lint`, or `test` step — it goes straight from `bun install` to `tauri-apps/tauri-action`, which invokes `beforeBuildCommand` and fails on a non-zero exit. The committed `dist/` is therefore either stale or produced by bypassing the gate.

## Why it matters

- The Windows installer cannot be built from a clean checkout, which is the only artefact this app ships.
- A red typecheck is a red safety net: the two real defects the compiler already found (`number | null` receipt date, the error-boundary generic) ship silently.
- Contributors get no signal: `bun run lint` and `tsc` are both absent from CI, so regressions accumulate (there are hundreds of errors now, which makes the signal worthless).

## Recommended fix

1. Make live code typecheck:
   - `src/components/createErrorBoundary.tsx`: constrain the factory to `E extends Error`, accept `new (...args: never[]) => E`, and cast the returned class (`as ComponentType<ErrorBoundaryProps<E>>`) or store the constructors as `readonly (new (...args: never[]) => E)[]` inside the closure instead of `classes.some(...)` on an untyped tuple.
   - `src/lib/receipt/build-header.ts`: decide what a credit receipt prints and handle `null` explicitly (fall back to `record.creditAt` / `createdAt`, see the credit-receipt report).
   - `src/pages/Home/z-NavGrid.tsx`: drop the unused import.
2. Delete the dead legacy trees (separate report) so `include: ["src"]` only covers shipping code.
3. Add `"typecheck": "tsc --noEmit"` and `"test": "bun test"` to `package.json`, and run `bun run typecheck && bun run lint` as a step in `windows-release.yml` **before** `tauri-action`, so a broken tree fails fast instead of mid-installer-build.

## Acceptance criteria

- `bun run build` exits 0 on a clean clone with no `dist/`.
- `npx tsc --noEmit` reports zero errors.
- CI runs typecheck (and lint) before building the installer, and a red typecheck blocks the release.
- No `tsc` error remains in `src/**` that is reachable from `src/route.tsx`.

## Verification

```
npx tsc --noEmit -p tsconfig.json --pretty false; echo "exit=$?"
# expect exit=0
bun run build
# expect a fresh dist/ and exit 0
```
Then push a commit that introduces a deliberate type error on a feature branch and confirm the release workflow fails at the typecheck step rather than inside `tauri build`.
