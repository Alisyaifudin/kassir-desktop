# Kassir

Aplikasi untuk kasir.

![beranda](./docs/static/img/shop.png)

# TODO

- tambah extra baru harusnya revalidate cache

add indexing on product-events for performance

# Future plan

## Sync (deferred)

- No `sync` service yet — it is the orchestrator over the other services' `get.unsync` / `sync.upsert` / `syncAt` (see `src/services/PLAN.md`, catalogue #13 and Phase 5).
- `src/lib/sync/*` is stale: it imports the removed `~/store` and has to be rewritten on top of the services.
- `src/pages/Setting/Sync_PENDING/` is legacy (`~/store` + `Result`), is **not** registered in `src/pages/Setting/index.tsx`, and is deliberately left out of the settings nav (`src/pages/Setting/util-nav.ts`).
- Intended UI: a floating sync pill at the `AuthLayout` level, not a `/setting/sync` subpage.