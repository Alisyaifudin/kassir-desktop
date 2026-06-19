# Faster TypeScript Type-Checking

`npx tsc --noEmit` is slow because it checks the entire project every time. Use these alternatives depending on context.

## Quick Reference

| Scenario | Command |
|---|---|
| Check a single file you just edited | `npx tsc-files <file>` |
| Check multiple specific files | `npx tsc-files <file1> <file2> ...` |
| Full project, repeated runs | `npx tsc --noEmit --incremental` |
| Pre-commit hook | `npx tsc-files` with staged `.ts` files |

## 1. `tsc-files` — Check Only Specific Files

Best for verifying edits without waiting for the full project.

```bash
npx tsc-files src/database/sqlx/record/add-new.ts src/lib/effect-error.ts
```

Only type-checks the listed files + their transitive dependencies. Usually finishes in 1–3 seconds.

### Install (if not present)

```bash
npm i -D tsc-files
```

### When to Use

- After editing one or a few files
- Quick "did my change break anything?" check
- Pre-commit validation

## 2. `tsc --incremental` — Cache-Aware Full Check

```bash
npx tsc --noEmit --incremental
```

First run is still slow. Second run reuses the `.tsbuildinfo` cache and is much faster.

### Enable Persistently

In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

### When to Use

- CI pipelines (cache the `.tsbuildinfo` file)
- Full project validation before pushing

## 3. IDE Diagnostics — Zero Cost

VS Code's TypeScript language service runs continuously in the background. Red squiggles appear instantly as you type.

### When to Use

- While developing — just look at the Problems panel
- No CLI invocation needed

## Recommendation

| Task | Use |
|---|---|
| Verify a single edit | `tsc-files` on that file |
| Verify multiple related files | `tsc-files` on all of them |
| Full project check before push | `tsc --noEmit --incremental` |
| While coding | IDE diagnostics (Problems panel) |

## Pattern for AI Agents

When checking TypeScript after edits:

1. Identify which files were changed
2. Run `npx tsc-files <changed-file-1> <changed-file-2> ...`
3. If errors reference other files, add them to the command and re-run
4. Only fall back to full `tsc --noEmit` if the issue is unclear
