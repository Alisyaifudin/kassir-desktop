---
slug: pos-extras-search-ignores-extra-service
title: "The POS \"Tambahan\" search reads a hardcoded 8-entry list instead of the Extra service catalog"
severity: high
category: correctness
iteration: 4
created: 2026-10-21T19:19:31.551Z
files:
  - "src/pages/Pos/presets.ts"
  - "src/pages/Pos/Draft/z-Extras.tsx"
  - "src/pages/Restock/Draft/z-Extras.tsx"
  - "src/services/extra/index.ts"
---

# The POS "Tambahan" search reads a hardcoded 8-entry list instead of the Extra service catalog

- **Severity:** high
- **Category:** correctness
- **Files:** `src/pages/Pos/presets.ts`, `src/pages/Pos/Draft/z-Extras.tsx`, `src/pages/Restock/Draft/z-Extras.tsx`, `src/services/extra/index.ts`
- **Iteration:** 4

## Summary

The Restock extras search subscribes to `service.extra.get.changes`; the POS extras search filters a module-level constant of eight names with `value: 0`. Extras the owner creates or re-prices in the Extra page therefore never reach the sale screen, and the ones whose names happen to match are seeded with a zero rate instead of their configured one — a second source of truth for money that is added to a sale, on the screen that takes the money.

## Details

## Evidence

`src/pages/Pos/presets.ts` (whole file) is the catalogue the sale screen searches:

```ts
export const EXTRA_PRESETS: ExtraPreset[] = [
  { id: "P1", name: "Ongkos Kirim", kind: "number", value: 0 },
  { id: "P2", name: "Biaya Packing", kind: "number", value: 0 },
  { id: "P3", name: "Biaya Kartu", kind: "percent", value: 0 },
  ... 8 entries total, every `value: 0`
];
```

`src/pages/Pos/Draft/z-Extras.tsx`:
- line 20 — `import { EXTRA_PRESETS } from "../presets";`
- lines 111-115 — the results pane filters that constant:
  ```ts
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return [];
    return EXTRA_PRESETS.filter((preset) => preset.name.toLowerCase().includes(needle));
  }, [query]);
  ```
- `addPreset` then seeds the draft row straight from the preset: `append({ id: generateId(), name: preset.name, kind: preset.kind, value: preset.value })`.

The Restock copy of the same panel does the opposite (`src/pages/Restock/Draft/z-Extras.tsx:80-95`):

```ts
const extraRes = useStream(service.extra.get.changes);
const presets: ExtraPreset[] = useMemo(
  () => extraRes.type === "success"
    ? extraRes.data.map((extra) => ({ id: extra.id, name: extra.name, kind: extra.kind, value: extra.value }))
    : [],
  [extraRes],
);
const results = useMemo(() => presets.filter(...), [presets, query]);
```

`src/services/extra/index.ts:32-36` already exposes exactly that live catalog (`get.all`, `get.changes` — "Tracks the catalog by name, so a write reaches every reader"). `rg EXTRA_PRESETS src` returns only `presets.ts` and its one import, i.e. nothing else in the app knows this list exists.

## Why it matters

- **An extra the owner configures is invisible on the POS.** Add "Pajak 11%" (or rename "Biaya Kartu" to "Biaya EDC") in the Extra page and the cashier cannot find it in the `Tambahan` search: the POS is filtering a compiler constant.
- **The rate is wrong even when the name matches.** The preset carries `value: 0`, so picking "Biaya Kartu" (a percent extra that the Extra page may hold at 3%) seeds an extra worth 0% — the cashier has to remember and retype the rate on every sale. Restock seeds the configured value.
- It is the exact failure the project rules name: `.agent/agent.md` — "Services own state; components subscribe… A module-level cache that nothing invalidates … becomes a second source of truth". This one is worse than a cache: it never reads the database at all.
- `id: "P1"…"P8"` are not catalog ids, so nothing written to the record can be traced back to the extra it came from.

## Recommended fix

1. Delete `src/pages/Pos/presets.ts`.
2. In `Pos/Draft/z-Extras.tsx`, mirror the Restock implementation: `const extraRes = useStream(service.extra.get.changes)`, map the rows to presets, and let `addPreset` carry `name`, `kind` and `value` from the service row. `+ Manual` stays as the ad-hoc escape hatch.
3. If the POS deliberately offers a narrower set than Restock, make that a service-level distinction (a flag/kind column on the extra row, read through the same stream) — never a hardcoded list.
4. This is also the durable fix for half of the cart duplication (see the `pos-restock-cart-duplication` report): once both extras panels read the service, their only real difference is the stage-toggle column, and they can become one component.

## Acceptance criteria

- Creating, renaming or re-pricing an extra in the Extra page changes the POS `Tambahan` search results **without a reload**.
- Picking a search result seeds the extra's configured `kind` and `value` (a 3% extra arrives at 3%, not 0%).
- `rg EXTRA_PRESETS src` returns nothing; `src/pages/Pos/presets.ts` is gone.
- A test covers it the way `src/services/extra` tests do: write an extra through `service.extra`, assert it appears in the list the POS panel renders.

## Verification

- `bun test` (extend the extra service test or add `src/pages/Pos/Draft/z-Extras.test.tsx` with `@testing-library/react`, already a devDependency).
- Manual: Extra page → add "Pajak 11%" → POS → F2 into `Tambahan` → type `pajak` → the row appears, picking it gives 11%.
- `bun run typecheck && bun run lint`.
