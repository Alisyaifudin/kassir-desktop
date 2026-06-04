# Database Layer Architecture

This skill documents the two-layer database architecture used in Kassir Desktop.

## Layers

```
src/database/
├── sqlx/        ← thin SQL wrapper (no logic, no caching)
├── db/          ← ORM-like layer (composes sqlx, adds caching)
└── db-types.ts  ← shared types
```

### `sqlx/` — Thin SQL Wrapper

- One file per table/entity (e.g., `sqlx/customer/`, `sqlx/extra/`).
- Each file exports raw functions that run SQL via the `DB` instance.
- **No business logic, no caching, no side effects beyond the query.**
- Functions receive primitive params or plain objects, return `Effect<T>`.
- Naming convention: `{verb}{Noun}()` — e.g. `getAllExtra()`, `addNewExtra()`, `deleteExtraById()`, `getExtraById()`.
- **Soft-delete filter**: queries always exclude deleted rows with `WHERE ... IS NULL` unless the purpose is sync.

**Example — `sqlx/extra/add.ts`:**

```ts
import { DB } from "../instance";
import { Effect } from "effect";
import { generateId } from "~/lib/random";

export function addNewExtra(name: string, value: number, kind: DB.ValueKind, now: number) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind,
     extra_updated_at, extra_sync_at, extra_deleted_at)
     VALUES ($1, $2, $3, $4, $5, null, null)`,
    [id, name, value, kind, now],
  ).pipe(Effect.as(id));
}
```

#### Read operations

```ts
// sqlx/extra/get-all.ts — list with soft-delete filter
export function getAllExtra() {
  return DB.select<DB.Extra[]>("SELECT * FROM extras WHERE extra_deleted_at IS NULL").pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.extra_id,
        kind: r.extra_kind,
        name: r.extra_name,
        value: r.extra_value,
        updatedAt: r.extra_updated_at,
        syncAt: r.extra_sync_at ?? undefined,
      })),
    ),
  );
}

// sqlx/extra/get-by-id.ts — single item with soft-delete filter
export function getExtraById(id: string) {
  return DB.select<DB.Extra[]>(
    "SELECT * FROM extras WHERE extra_id = $1 AND extra_deleted_at IS NULL",
    [id],
  ).pipe(
    Effect.flatMap((r) => (r.length === 0 ? NotFound.fail("Not found") : Effect.succeed(r[0]))),
    Effect.map((r) => ({
      id: r.extra_id,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
      updatedAt: r.extra_updated_at,
      syncAt: r.extra_sync_at ?? undefined,
    })),
  );
}

// sqlx/extra/get-all-unsync.ts — unsynced items (no deleted rows)
export function getAllUnsyncExtras() {
  return DB.select<DB.Extra[]>(
    "SELECT * FROM extras WHERE extra_sync_at IS NULL AND extra_deleted_at IS NULL",
  ).pipe(Effect.map(/* ... same mapping ... */));
}
```

#### Write operations

```ts
// sqlx/extra/update.ts — full update
export function update(id: string, name: string, value: number, kind: DB.ValueKind, now: number) {
  return DB.execute(
    `UPDATE extras SET extra_name = $1, extra_kind = $2, extra_value = $3,
     extra_updated_at = $4, extra_sync_at = null WHERE extra_id = $5`,
    [name, kind, value, now, id],
  ).pipe(Effect.asVoid);
}

// sqlx/extra/del-by-id.ts — soft delete (set deleted_at, clear sync_at)
export function deleteExtraById(id: string, now: number) {
  return DB.execute(
    `UPDATE extras SET extra_deleted_at = $1, extra_updated_at = $2,
     extra_sync_at = null WHERE extra_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
```

#### Batch operations

Batch queries use dynamic `$${bindingIndex}` placeholders wrapped in `BEGIN TRANSACTION;...COMMIT;`:

```ts
// sqlx/extra/update-sync-many.ts — batch sync update
export function updateManyExtrasSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () => `UPDATE extras SET extra_sync_at = $${bindingIndex++}
           WHERE extra_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}

// sqlx/extra/del-many-sync.ts — batch soft-delete for synced deletion
export function deleteManyExtrasSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () => `UPDATE extras SET extra_deleted_at = $${bindingIndex++},
           extra_updated_at = $${bindingIndex++}, extra_sync_at = $${bindingIndex++}
           WHERE extra_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
```

#### Upsert operations

```ts
// sqlx/extra/upsert-one.ts — single upsert
export function upsertOneExtra({ id, name, value, kind, updatedAt, now }: { ... }) {
  return DB.execute(
    `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind,
     extra_updated_at, extra_sync_at, extra_deleted_at)
     VALUES ($1, $2, $3, $4, $5, $6, null) ON CONFLICT DO UPDATE SET
     extra_name = excluded.extra_name, extra_value = excluded.extra_value,
     extra_kind = excluded.extra_kind,
     extra_updated_at = excluded.extra_updated_at,
     extra_sync_at = excluded.extra_sync_at,
     extra_deleted_at = excluded.extra_deleted_at`,
    [id, name, value, kind, updatedAt, now],
  ).pipe(Effect.as(id));
}

// sqlx/extra/upsert-many.ts — batch upsert
export function upsertManyExtras({ extras, now }: { extras: { ... }[]; now: number }) {
  // dynamic $$ placeholders + flatMap bindings + ON CONFLICT (extra_id)
}
```

#### `sqlx/extra/index.ts` — Barrel exports

```ts
export const extra = {
  get: {
    all: getAllExtra,
    unsync: getAllUnsyncExtras,
    byId: getExtraById,
  },
  delete: {
    byId: deleteExtraById,
    sync: deleteManyExtrasSync,
  },
  update: {
    one: update,
    sync: {
      one: updateSyncOneExtra,
      many: updateManyExtrasSync,
    },
  },
  add: {
    one: addNewExtra,
  },
  upsert: {
    one: upsertOneExtra,
    many: upsertManyExtras,
  },
};
```

**Key rules:**

- Only raw SQL and `DB.execute` / `DB.select`.
- Accepts all parameters explicitly (even timestamps — callers generate `Date.now()`).
- Returns raw DB results or mapped objects (e.g., mapping `extra_id` → `id`).
- Soft-delete: all read queries filter with `WHERE ..._deleted_at IS NULL`.
- Dynamic placeholders (`$${bindingIndex++}`) for batch queries.
- Multi-statement batches wrapped in `BEGIN TRANSACTION;...COMMIT;`.
- No caching, no business logic.

---

### `db/` — ORM-like Layer

- One directory per entity (e.g., `db/customer/`, `db/extra/`), or a single file for simple entities (`db/cashier.ts`).
- Each file **composes** one or more `sqlx` calls from the corresponding `sqlx/<entity>/` directory.
- **Adds caching** via `CacheItem<T>` — cache-first on reads, write-through on writes.
- **All application code consumes this layer, never `sqlx` directly.**
- **Timestamps are generated here** (`Date.now()`) and passed down to `sqlx/`.
- The `db/` barrel index **mirrors the `sqlx/` barrel shape** — matching nested keys make it easy to swap between cached and uncached.

**Pattern — entity with caching (read operations):**

```ts
// db/extra/get-all.ts — cache-first
export function getAllExtras() {
  const extras = cache.all();
  if (extras) return Effect.succeed(extras);
  return sqlx.extra.get.all().pipe(Effect.tap((items) => cache.set(items)));
}

// db/extra/get-by-id.ts — cache-first
export function getExtraById(id: string) {
  const extra = cache.get(id);
  if (extra !== undefined) return Effect.succeed(extra);
  return sqlx.extra.get.byId(id);
}

// db/extra/get-all-unsync.ts — cache-first filter, fallback to sqlx
export function getAllExtrasUnsync() {
  const extras = cache.all();
  if (extras) return Effect.succeed(extras.filter((e) => e.syncAt === undefined));
  return sqlx.extra.get.unsync();
}
```

**Pattern — entity with caching (write operations — write-through):**

```ts
// db/extra/add.ts — generates id/timestamp, writes through cache
export function addNewExtra({ name, value, kind, now }: Input) {
  return sqlx.extra.add.one({ name, value, kind, now }).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, value, kind, updatedAt: now });
    }),
  );
}

// db/extra/update.ts — generates timestamp, writes through cache
export function update({ id, kind, name, value }: Extra) {
  const now = Date.now();
  return sqlx.extra.update.one(id, name, value, kind, now).pipe(
    Effect.tap(() => {
      cache.update(id, { id, kind, name, value, updatedAt: now, syncAt: undefined });
    }),
  );
}

// db/extra/del-by-id.ts — soft delete with write-through
export function deleteExtraById(id: string) {
  const now = Date.now();
  return sqlx.extra.delete.byId(id, now).pipe(Effect.tap(() => cache.delete(id)));
}

// db/extra/sync.ts — sync single with callback-based cache update
export function updateSyncOneExtra(id: string, now: number) {
  return sqlx.extra.update.sync.one(id, now).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, syncAt: now }));
    }),
  );
}
```

**Pattern — batch operations:**

```ts
// db/extra/del-sync.ts — batch delete with write-through
export function deleteManyExtrasSync(ids: string[], now: number) {
  return sqlx.extra.delete
    .sync(ids, now)
    .pipe(Effect.tap(() => ids.forEach((id) => cache.delete(id))));
}

// db/extra/update-sync-many.ts — batch sync
export function updateSyncManyExtras(ids: string[], now: number) {
  return sqlx.extra.update.sync
    .many(ids, now)
    .pipe(
      Effect.tap(() => ids.forEach((id) => cache.update(id, (prev) => ({ ...prev, syncAt: now })))),
    );
}
```

**Pattern — upsert:**

```ts
// db/extra/upsert-one.ts — generates timestamp, write-through
export function upsertOneExtra({ id, name, value, kind, updatedAt, now }: { ... }) {
  return sqlx.extra.upsert.one({ id, name, value, kind, updatedAt, now }).pipe(
    Effect.tap(() => {
      cache.update(id, { id, name, value, kind, updatedAt, syncAt: now });
    }),
  );
}

// db/extra/upsert-many.ts — batch upsert
export function upsertMany(extras: ..., now: number) {
  return sqlx.extra.upsert.many({ extras, now }).pipe(
    Effect.tap(() => { extras.forEach(({ id, ... }) => cache.update(...)); }),
  );
}
```

**`db/extra/index.ts` — Barrel exports (mirrors `sqlx/extra` shape):**

```ts
export const extra = {
  get: { all: getAllExtras, unsync: getAllExtrasUnsync, byId: getExtraById },
  delete: { byId: deleteExtraById, sync: deleteManyExtrasSync },
  update: {
    one: update,
    sync: { one: updateSyncOneExtra, many: updateSyncManyExtras },
  },
  add: { one: addNewExtra },
  upsert: { one: upsertOne, many: upsertMany },
  revalidate: cache.revalidate,
};
```

**Pattern — entity without caching (pass-through):**

```ts
// db/cashier.ts
import { sqlx } from "../sqlx";

export const cashier = {
  get: {
    all: sqlx.cashier.get.all,
    byId: sqlx.cashier.get.byId,
  },
  add: sqlx.cashier.add,
  update: { name: sqlx.cashier.update.name, ... },
  delete: sqlx.cashier.delete,
};
```

Even when there's no caching, **still wrap through `db/`** so all consumers have a single entry point and the cache can be added later without changing call sites.

---

## Cache Pattern

### `CacheItem<T>` (`src/lib/cache-factory.ts`)

A generic in-memory cache keyed by `{ id: string }`:

| Method                           | Behavior                                      |
| -------------------------------- | --------------------------------------------- |
| `set(items: T[])`                | Replaces entire cache                         |
| `get(id: string)`                | Returns single item or `undefined`            |
| `all()`                          | Returns `T[]` or `null` if cache is empty     |
| `update(id, item: T)`            | Full replacement of cache entry               |
| `update(id, cb: (item: T) => T)` | Callback-based update (skips if item missing) |
| `delete(id)`                     | Removes entry                                 |
| `revalidate()`                   | Clears the cache                              |

### Entity Cache File (`db/<entity>/cache.ts`)

Defines the entity type and creates the cache instance:

```ts
// db/customer/cache.ts
import { CacheItem } from "~/lib/cache-factory";

export type CustomerFull = {
  id: string;
  name: string;
  phone: string;
  updatedAt: number;
  syncAt?: number;
};

export const cache = new CacheItem<CustomerFull>();
```

### Cache Usage in Operations

**Get (cache-first):**

```ts
export function getAllExtras() {
  const extras = cache.all();
  if (extras) return Effect.succeed(extras);
  return sqlx.extra.get.all().pipe(Effect.tap((items) => cache.set(items)));
}
```

**Get by ID (cache-first):**

```ts
export function getExtraById(id: string) {
  const extra = cache.get(id);
  if (extra !== undefined) return Effect.succeed(extra);
  return sqlx.extra.get.byId(id);
}
```

**Add (write-through with object input):**

```ts
export function addNewExtra({
  name,
  value,
  kind,
}: {
  name: string;
  value: number;
  kind: DB.ValueKind;
}) {
  const now = Date.now();
  return sqlx.extra.add.one({ name, value, kind, now }).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, value, kind, updatedAt: now });
    }),
  );
}
```

**Update (write-through — full replacement):**

```ts
export function update({ id, kind, name, value }: Extra) {
  const now = Date.now();
  return sqlx.extra.update.one(id, name, value, kind, now).pipe(
    Effect.tap(() => {
      cache.update(id, { id, kind, name, value, updatedAt: now, syncAt: undefined });
    }),
  );
}
```

**Sync (write-through — callback-based, preserves other fields):**

```ts
export function updateSyncOneExtra(id: string) {
  const now = Date.now();
  return sqlx.extra.update.sync.one(id, now).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, syncAt: now }));
    }),
  );
}
```

**Delete (write-through):**

```ts
export function deleteExtraById(id: string) {
  const now = Date.now();
  return sqlx.extra.delete.byId(id, now).pipe(Effect.tap(() => cache.delete(id)));
}
```

**Batch delete (write-through):**

```ts
export function deleteManyExtrasSync(ids: string[], now: number) {
  return sqlx.extra.delete
    .sync(ids, now)
    .pipe(Effect.tap(() => ids.forEach((id) => cache.delete(id))));
}
```

**Upsert (write-through):**

```ts
export function upsertOneExtra({ id, name, value, kind, updatedAt }: { ... }) {
  const now = Date.now();
  return sqlx.extra.upsert.one({ id, name, value, kind, updatedAt, now }).pipe(
    Effect.tap(() => {
      cache.update(id, { id, name, value, kind, updatedAt, syncAt: now });
    }),
  );
}
```

---

## File Structure Convention

```
src/database/
├── db/
│   ├── index.ts           ← aggregates all db/ exports
│   ├── cashier.ts         ← simple entity (no cache)
│   ├── customer/
│   │   ├── index.ts       ← public API for this entity
│   │   ├── cache.ts       ← type + CacheItem instance
│   │   ├── add.ts
│   │   ├── get-all.ts
│   │   ├── update.ts
│   │   ├── del-by-id.ts
│   │   └── ...
│   ├── extra/             ← full entity with all operations
│   │   ├── index.ts       ← barrel: mirrors sqlx shape + revalidate
│   │   ├── cache.ts       ← ExtraFull type + CacheItem instance
│   │   ├── add.ts
│   │   ├── get-all.ts
│   │   ├── get-all-unsync.ts
│   │   ├── get-by-id.ts
│   │   ├── update.ts
│   │   ├── del-by-id.ts
│   │   ├── del-sync.ts
│   │   ├── update-sync-one.ts
│   │   ├── update-sync-many.ts
│   │   ├── upsert-one.ts
│   │   └── upsert-many.ts
│   └── ...
├── sqlx/
│   ├── index.ts           ← aggregates all sqlx/ exports
│   ├── instance.ts        ← DB connection/setup
│   ├── customer/
│   │   ├── index.ts
│   │   ├── add.ts
│   │   ├── get-all.ts
│   │   ├── update.ts
│   │   └── del-by-id.ts
│   ├── extra/             ← full entity with all operations
│   │   ├── index.ts       ← barrel: nested namespace
│   │   ├── add.ts
│   │   ├── get-all.ts
│   │   ├── get-all-unsync.ts
│   │   ├── get-by-id.ts
│   │   ├── update.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   ├── update-sync-one.ts
│   │   ├── update-sync-many.ts
│   │   ├── upsert-one.ts
│   │   └── upsert-many.ts
│   └── ...
│   └── ...
└── migrations/            ← SQL migration files
```

## Rules

1. **Application code imports from `db/` only.** Never import `sqlx/` directly outside of `db/`.
2. **`sqlx/` is pure SQL.** No caching, no composing other sqlx calls, no business logic.
3. **`db/` may compose multiple sqlx calls** if an operation spans tables.
4. **Cache invalidation is the responsibility of `db/`.** Every write operation must update the cache — full replacement for create/update, callback-based for partial updates (e.g., sync), and `delete()` for deletes.
5. **The `db/<entity>/index.ts` barrel mirrors the `sqlx/<entity>/index.ts` barrel shape.** This keeps the public API consistent whether caching is present or not.
6. **Timestamps are generated in `db/`** via `Date.now()` and passed down to `sqlx/`. `sqlx/` never calls `Date.now()`.
7. **Soft-delete pattern:** use `ALTER TABLE ... ADD COLUMN ..._deleted_at INTEGER`. All read queries filter with `WHERE ..._deleted_at IS NULL`. Write queries set the column on delete. The column is `null` on insert.
8. **Batch operations** use dynamic `$${bindingIndex++}` placeholders wrapped in `BEGIN TRANSACTION;` / `COMMIT;` with a single flat bindings array via `flatMap`.
9. **Operation variants are separate files.** For operations with single and batch variants, use `-one.ts` / `-many.ts` suffix (e.g., `upsert-one.ts`, `upsert-many.ts`, `update-sync-one.ts`, `update-sync-many.ts`).
10. **Template files with commented-out code are intentional** — they serve as scaffolding for future operations. Do not delete them.
