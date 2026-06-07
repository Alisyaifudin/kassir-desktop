# Database Layer Architecture

This skill documents the two-layer database architecture used in Kassir Desktop.

## Layers

```
src/database/
├── sqlx/        ← thin SQL wrapper (no logic, no caching)
├── db/          ← ORM-like layer (composes sqlx, adds caching)
└── database-type.d.ts  ← DB namespace types (Extra, Image, Method, etc.)
```

### `sqlx/` — Thin SQL Wrapper

- One directory per entity (e.g., `sqlx/extra/`, `sqlx/image/`).
- Each file exports raw functions that run SQL via the `DB` instance.
- **No business logic, no caching, no side effects beyond the query.**
- Functions receive params as typed objects or primitives, return `Effect<T>`.
- **File names are descriptive**: `add-new.ts`, `del-by-id.ts`, `del-many-sync.ts`, `get-all.ts`, `get-by-id.ts`, `get-unsync-after.ts`, `update.ts`, `update-one-sync.ts`, `update-many-sync-at.ts`, `update-unsync-all.ts`, `upsert-many-sync.ts`.
- **Soft-delete filter**: read queries exclude deleted rows with `WHERE ..._deleted_at IS NULL` (unless the purpose is sync/after).
- **Timestamps never generated here** — callers pass `now: number`.

**Example — `sqlx/extra/add.ts`:**

```ts
import { DB } from "../instance";
import { Effect } from "effect";
import { generateId } from "~/lib/random";

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
  now: number;
};

export function addNewExtra({ name, value, kind, now }: Input) {
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
        id: r.extra_id, kind: r.extra_kind, name: r.extra_name,
        value: r.extra_value, updatedAt: r.extra_updated_at,
        syncAt: r.extra_sync_at ?? undefined,
      })),
    ),
  );
}

// sqlx/extra/get-by-id.ts — single item with soft-delete filter + NotFound
export function getExtraById(id: string) {
  return DB.select<DB.Extra[]>(
    "SELECT * FROM extras WHERE extra_id = $1 AND extra_deleted_at IS NULL",
    [id],
  ).pipe(
    Effect.flatMap((r) =>
      r.length === 0 ? NotFound.fail("Biaya lainnya tidak ditemukan") : Effect.succeed(r[0]),
    ),
    Effect.map((r) => ({
      id: r.extra_id, kind: r.extra_kind, name: r.extra_name,
      value: r.extra_value, updatedAt: r.extra_updated_at,
      syncAt: r.extra_sync_at ?? undefined,
    })),
  );
}

// sqlx/extra/get-unsync-after.ts — unsynced changes after timestamp (returns { exist, deleted })
export function getUnsyncExtrasAfter(timestamp: number) {
  return DB.select<DB.Extra[]>(
    "SELECT * FROM extras WHERE extra_updated_at > $1 AND extra_sync_at IS NULL",
    [timestamp],
  ).pipe(
    Effect.map((res) =>
      res.reduce(
        (acc, r) => {
          if (r.extra_deleted_at === null) {
            acc.exist.push({ id: r.extra_id, name: r.extra_name, value: r.extra_value,
              kind: r.extra_kind, updatedAt: r.extra_updated_at });
          } else {
            acc.deleted.push({ id: r.extra_id, deletedAt: r.extra_deleted_at,
              updatedAt: r.extra_updated_at });
          }
          return acc;
        },
        { exist: [], deleted: [] } as { exist: ExistExtra[]; deleted: DeletedExtra[] },
      ),
    ),
  );
}
```

#### Write operations

```ts
// sqlx/extra/update.ts — full update (clears sync_at)
export function update(id: string, name: string, value: number, kind: DB.ValueKind, now: number) {
  return DB.execute(
    `UPDATE extras SET extra_name = $1, extra_kind = $2, extra_value = $3,
     extra_updated_at = $4, extra_sync_at = null WHERE extra_id = $5`,
    [name, kind, value, now, id],
  ).pipe(Effect.asVoid);
}

// sqlx/extra/del-by-id.ts — soft delete (sets deleted_at, clears sync_at)
export function deleteExtraById(id: string, now: number) {
  return DB.execute(
    `UPDATE extras SET extra_deleted_at = $1, extra_updated_at = $2,
     extra_sync_at = null WHERE extra_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}

// sqlx/extra/update-unsync-all.ts — reset all sync timestamps
export function updateUnsyncAllExtras() {
  return DB.execute("UPDATE extras SET extra_sync_at = null").pipe(Effect.asVoid);
}
```

#### Sync operations

```ts
// sqlx/extra/update-one-sync.ts — sync a single item (full overwrite from server)
export function updateSyncOneExtra(
  { id, name, value, kind, updatedAt }: { ... },
  now: number,
) {
  return DB.execute(
    `UPDATE extras SET extra_name = $1, extra_value = $2, extra_kind = $3,
     extra_updated_at = $4, extra_sync_at = $5 WHERE extra_id = $6`,
    [name, value, kind, updatedAt, now, id],
  ).pipe(Effect.asVoid);
}
```

#### Batch operations

Batch queries use dynamic `$${bindingIndex++}` placeholders wrapped in `BEGIN TRANSACTION;...COMMIT;`:

```ts
// sqlx/extra/update-many-sync-at.ts — batch sync update
export function updateManyExtrasSyncAt(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () => `UPDATE extras SET extra_sync_at = $${bindingIndex++} WHERE extra_id = $${bindingIndex++};`,
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

// sqlx/extra/upsert-many-sync.ts — batch upsert
export function upsertManyExtras({ extras, now }: { extras: {...}[], now: number }) {
  let bindingIndex = 1;
  const placeholders = extras.map(
    () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
           $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
  ).join(", ");
  const bindings = extras.flatMap(({ id, name, value, kind, updatedAt }) => [
    id, name, value, kind, updatedAt, now, null,
  ]);
  return DB.execute(
    `INSERT INTO extras (...) VALUES ${placeholders} ON CONFLICT (extra_id) DO UPDATE SET ...`,
    bindings,
  ).pipe(Effect.as(extras.map((e) => e.id)));
}
```

#### `sqlx/extra/index.ts` — Barrel shape (reference for db mirror)

```ts
export const extra = {
  get: {
    all: getAllExtra,
    unsync: { after: getUnsyncExtrasAfter },
    byId: getExtraById,
  },
  delete: { byId: deleteExtraById },
  update: { one: update, unsyncAll: updateUnsyncAllExtras },
  add: { one: addNewExtra },
  sync: {
    delete: { many: deleteManyExtrasSync },
    update: { one: updateSyncOneExtra, many: { syncAt: updateManyExtrasSyncAt } },
    upsert: { many: upsertManyExtras },
  },
};
```

**Key rules for sqlx:**

- Only raw SQL and `DB.execute` / `DB.select`.
- Accepts all parameters explicitly (even timestamps — callers generate `Date.now()`).
- Returns raw DB results mapped to camelCase objects (e.g., `extra_id` → `id`).
- Soft-delete: all read queries filter with `WHERE ..._deleted_at IS NULL` (except `get-unsync-after` which includes deleted rows in the result).
- Dynamic `$${bindingIndex++}` placeholders for batch queries.
- Multi-statement batches wrapped in `BEGIN TRANSACTION;...COMMIT;` with single flat `bindings[]` via `flatMap`.
- No caching, no business logic, no composing other sqlx calls.

---

### `db/` — ORM-like Layer

- One directory per entity (e.g., `db/extra/`, `db/image/`), or a single file for simple entities (`db/cashier.ts`).
- **File names mirror sqlx file names exactly**: `add-new.ts`, `del-by-id.ts`, `del-many-sync.ts`, `get-all.ts`, `get-by-id.ts`, `get-unsync-after.ts`, `update.ts`, `update-one-sync.ts`, `update-many-sync-at.ts`, `update-unsync-all.ts`, `upsert-many-sync.ts`.
- Each file **composes** one or more `sqlx` calls from the corresponding `sqlx/<entity>/` directory.
- **Adds caching** — cache-first on reads, write-through on writes.
- **All application code consumes this layer, never `sqlx` directly.**
- **Timestamps are generated here** (`Date.now()`) and passed down to `sqlx/`.
- **The `db/` barrel index exactly mirrors the `sqlx/` barrel shape** plus a `revalidate` key at the end.
- **No backward-compat aliases.** The barrel has one canonical path per operation.
- **No sync-specific extra paths.** Sync operations use the same barrel paths as everything else.

#### Cache-first read patterns

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

// db/extra/get-unsync-after.ts — cache-first filter, fallback to sqlx
export function getUnsyncExtrasAfter(timestamp: number) {
  const extras = cache.all();
  if (extras) {
    return Effect.succeed(
      extras.filter((e) => e.syncAt === undefined && e.updatedAt > timestamp),
    );
  }
  return sqlx.extra.get.unsync.after(timestamp);
}
```

#### Write-through patterns

```ts
// db/extra/add-new.ts — generates timestamp, writes through cache
export function addNewExtra({ name, value, kind, now }: Input) {
  return sqlx.extra.add.one({ name, value, kind, now }).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, value, kind, updatedAt: now });
    }),
  );
}

// db/extra/update.ts — generates timestamp, writes through cache (full replacement)
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

// db/extra/update-unsync-all.ts — invalidates entire cache
export function updateUnsyncAllExtras() {
  return sqlx.extra.update.unsyncAll().pipe(Effect.tap(() => cache.revalidate()));
}
```

#### Sync write-through (callback-based partial update)

```ts
// db/extra/update-one-sync.ts — sync single with callback-based cache update
export function updateOneExtraSync(
  extra: { id: string; name: string; value: number; kind: DB.ValueKind; updatedAt: number },
  now: number,
) {
  return sqlx.extra.sync.update.one(extra, now).pipe(
    Effect.tap(() => {
      cache.update(extra.id, { ...extra, syncAt: now });
    }),
  );
}

// db/extra/update-many-sync-at.ts — batch sync
export function updateManyExtrasSyncAt(ids: string[], now: number) {
  return sqlx.extra.sync.update.many.syncAt(ids, now).pipe(
    Effect.tap(() => {
      ids.forEach((id) => cache.update(id, (prev) => ({ ...prev, syncAt: now })));
    }),
  );
}
```

#### Batch write-through

```ts
// db/extra/del-many-sync.ts — batch delete
export function deleteManyExtrasSync(ids: string[], now: number) {
  return sqlx.extra.sync.delete
    .many(ids, now)
    .pipe(Effect.tap(() => ids.forEach((id) => cache.delete(id))));
}

// db/extra/upsert-many-sync.ts — batch upsert
export function upsertManyExtrasSync(
  extras: { id: string; name: string; value: number; kind: DB.ValueKind; updatedAt: number }[],
  now: number,
) {
  return sqlx.extra.sync.upsert.many({ extras, now }).pipe(
    Effect.tap(() => {
      extras.forEach(({ id, name, value, kind, updatedAt }) => {
        cache.update(id, { id, name, value, kind, updatedAt, syncAt: now });
      });
    }),
  );
}
```

#### `db/extra/index.ts` — Barrel (exact mirror of sqlx + revalidate)

```ts
export const extra = {
  get: {
    all: getAllExtras,
    unsync: { after: getUnsyncExtrasAfter },
    byId: getExtraById,
  },
  delete: { byId: deleteExtraById },
  update: { one: update, unsyncAll: updateUnsyncAllExtras },
  add: { new: addNewExtra },
  sync: {
    delete: { many: deleteManyExtrasSync },
    update: { one: updateOneExtraSync, many: { syncAt: updateManyExtrasSyncAt } },
    upsert: { many: upsertManyExtrasSync },
  },
  revalidate: cache.revalidate,
};
```

---

### Composite-Key Cache (image entity)

For entities keyed by a parent (images → product), use a raw `Map<parentId, ItemFull[]>` wrapped in an exported `cache` object:

```ts
// db/image/cache.ts
export type Image = { order: number; id: string; name: string; mime: DB.Mime; };
export type ImageFull = Image & { productId: string; updatedAt: number; syncAt?: number; hash?: string; };

const _cache: Map<string, ImageFull[]> = new Map();

export const cache = {
  getAll() {
    return Array.from(_cache.values()).flat();
  },
  get(productId: string) {
    return _cache.get(productId);
  },
  set(productId: string, images: ImageFull[]) {
    _cache.set(productId, images);
  },
  update(productId: string, updater: (images: ImageFull[]) => ImageFull[]) {
    const data = _cache.get(productId);
    if (data !== undefined) _cache.set(productId, updater(data));
  },
  revalidate() {
    _cache.clear();
  },
};
```

**Key points:**
- `cache` is an exported object, **not** a `CacheItem` instance.
- `get(productId)` returns `ImageFull[] | undefined`.
- `getAll()` flattens all product groups for global queries (e.g., `getUnsyncImagesAfter`).
- `update(productId, updater)` uses a callback pattern for immutable updates.
- **No `CacheItem` import** in the cache file.

#### Composite-key read patterns

```ts
// db/image/get-by-product-id.ts — cache-first by productId
export function getImagesByProductId(productId: string) {
  const images = cache.get(productId);
  if (images !== undefined) return Effect.succeed(images);
  return sqlx.image.get.byProductId(productId).pipe(
    Effect.map((images) => { cache.set(productId, images); return images as ImageFull[]; }),
  );
}

// db/image/get-after.ts — cache-first using getAll(), filters across all products
export function getUnsyncImagesAfter(timestamp: number) {
  const images = cache.getAll();
  if (images.length > 0) {
    return Effect.succeed(
      images.filter((img) => img.syncAt === undefined && img.updatedAt > timestamp),
    );
  }
  return sqlx.image.get.unsync.after(timestamp);
}
```

#### Composite-key write patterns

```ts
// db/image/add-new.ts — gets maxOrder from cache or sqlx, writes through
export function addNewImage({ name, mime, productId }: { ... }) {
  const now = Date.now();
  return Effect.gen(function* () {
    const maxOrder = yield* getMaxOrder(productId);
    const id = yield* sqlx.image.add.new({ name, mime, productId, maxOrder, now });
    cache.update(productId, (prev) => [
      ...prev, { id, mime, name, productId, order: maxOrder + 1, updatedAt: now },
    ]);
    return id;
  });
}
// getMaxOrder is a local function in the same file:
function getMaxOrder(productId: string) {
  const images = cache.get(productId);
  if (images !== undefined) {
    if (images.length === 0) return Effect.succeed(0);
    return Effect.succeed(Math.max(...images.map((c) => c.order)));
  }
  return sqlx.image.get.maxOrder(productId);
}

// db/image/del-by-id.ts — resolves productId via sqlx, updates cache
export function deleteImageById(id: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const productId = yield* sqlx.image.get.productId.one(id);
    yield* sqlx.image.delete.byId(id, now);
    cache.update(productId, (prev) => prev.filter((p) => p.id !== id));
  });
}

// db/image/del-many-sync.ts — resolves productIds via sqlx, filters cache per product
export function deleteManyImagesSync(ids: string[], now: number) {
  return Effect.gen(function* () {
    const productIds = yield* sqlx.image.get.productId.many(ids);
    yield* sqlx.image.sync.delete.many(ids, now);
    productIds.forEach(({ productId, id }) =>
      cache.update(productId, (prev) => prev.filter((p) => p.id !== id)),
    );
  });
}
```

#### Composite-key: swap and sync-many with immer

For in-place array mutations in the composite-key cache, use `immer/produce`:

```ts
// db/image/update-swap.ts — swaps two image orders, validates same product
export function updateSwapImage(imageAId: string, imageBId: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const [resA, resB] = yield* Effect.all(
      [sqlx.image.get.order(imageAId), sqlx.image.get.order(imageBId)],
      { concurrency: "unbounded" },
    );
    if (resA.productId !== resB.productId)
      return yield* InvalidOperation.fail("Gambar harus dari produk yang sama");
    yield* sqlx.image.update.swap(
      { id: imageAId, order: resA.order },
      { id: imageBId, order: resB.order },
      now,
    );
    cache.update(resA.productId,
      produce((draft) => {
        const idxA = draft.findIndex((d) => d.id === imageAId);
        const idxB = draft.findIndex((d) => d.id === imageBId);
        if (idxA === -1 || idxB === -1) return;
        draft[idxA].order = resB.order;
        draft[idxB].order = resA.order;
      }),
    );
  });
}

// db/image/update-sync-many.ts — batch sync, resolves productIds, updates per product
export function updateSyncManyImages(ids: string[], now: number) {
  return Effect.gen(function* () {
    const productIds = yield* sqlx.image.get.productId.many(ids);
    yield* sqlx.image.sync.update.many.syncAt(ids, now);
    productIds.forEach(({ productId, id }) =>
      cache.update(productId,
        produce((draft) => {
          const idx = draft.findIndex((d) => d.id === id);
          if (idx === -1) return;
          draft[idx].syncAt = now;
        }),
      ),
    );
  });
}
```

#### Composite-key upsert (group by productId, merge)

```ts
// db/image/upsert-many-sync.ts
export function upsertManyImages({ images, now }: { images: {...}[], now: number }) {
  return sqlx.image.sync.upsert.many(images, now).pipe(
    Effect.tap(() => {
      const byProductId = new Map<string, ImageFull[]>();
      for (const img of images) {
        const group = byProductId.get(img.productId) ?? [];
        group.push({ id: img.id, name: img.name, mime: img.mime, order: img.order,
          productId: img.productId, updatedAt: img.updatedAt, syncAt: now, hash: img.hash });
        byProductId.set(img.productId, group);
      }
      for (const [productId, imgs] of byProductId) {
        const cached = cache.get(productId);
        if (cached !== undefined) {
          const merged = [...cached];
          for (const img of imgs) {
            const idx = merged.findIndex((c) => c.id === img.id);
            if (idx !== -1) merged[idx] = img; else merged.push(img);
          }
          cache.set(productId, merged);
        } else {
          cache.set(productId, imgs);
        }
      }
    }),
  );
}
```

---

### Method Entity Patterns

The `method` entity follows the same `db/` ↔ `sqlx/` mirror pattern but with entity-specific naming:

```ts
// db/method/index.ts
export const method = {
  get: {
    all: getAllMethods,
    unsync: { after: getUnsyncMethodsAfter },
  },
  delete: { byId: deleteMethodById },
  add: { new: addNewMethod },
  update: {
    name: updateMethodName,       // ← semantic name, not "one"
    unsyncAll: updateUnsyncAll,
  },
  sync: {
    delete: { many: deleteManyMethodsSync },
    update: { many: { syncAt: updateManyMethodsSyncAt } },
    upsert: { many: upsertManyMethods },
  },
  revalidate: cache.revalidate,
};
```

**Method-specific notes:**
- `update.name` instead of `update.one` — uses a semantic key reflecting what's being updated.
- Method `kind` is constrained to `Exclude<DB.MethodEnum, "cash">` for user-created methods (cash is a built-in method).
- Method has both `name` (required, user-visible) and `label` (optional, display variant) fields.
- Method uses `CacheItem<MethodFull>` (standard single-entity cache).

---

## Cache Pattern Summary

### `CacheItem<T>` (`src/lib/cache-factory.ts`)

For single-entity caches keyed by `id`:

| Method | Behavior |
|---|---|
| `set(items: T[])` | Replaces entire cache |
| `get(id: string)` | Returns single item or `undefined` |
| `all()` | Returns `T[]` or `null` if cache never set |
| `update(id, item: T)` | Full replacement of cache entry |
| `update(id, cb: (item: T) => T)` | Callback-based partial update (skips if missing) |
| `delete(id)` | Removes entry |
| `revalidate()` | Clears the cache |

### Composite-key cache (image)

Raw `Map<parentId, ItemFull[]>` exposed as an object:

| Method | Behavior |
|---|---|
| `get(productId)` | Returns `ImageFull[]` or `undefined` |
| `set(productId, images)` | Replaces entire group |
| `update(productId, updater)` | Callback-based update (skips if group missing) |
| `getAll()` | Flattens all groups into single `ImageFull[]` |
| `revalidate()` | Clears the entire Map |

### Cache write-through strategies

| Operation | Cache strategy |
|---|---|
| **Add** | `cache.update(id, { ...fullObject })` — full replacement |
| **Update** | `cache.update(id, { ...fullObject })` — full replacement |
| **Delete** | `cache.delete(id)` |
| **Delete many** | `ids.forEach(id => cache.delete(id))` |
| **Sync (one)** | `cache.update(id, { ...spread, syncAt: now })` — full merge |
| **Sync (many)** | `cache.update(id, prev => ({ ...prev, syncAt: now }))` — callback partial |
| **Update name** (method) | `cache.update(id, prev => ({ ...prev, name, label }))` — callback partial |
| **Unsync all** | `cache.revalidate()` — full invalidation |
| **Upsert many** | Per-item full replacement |
| **Image swap** | `immer/produce` on the array for that productId |
| **Image sync many** | `immer/produce` on the array per productId |

---

## File Structure Convention

```
src/database/
├── db/
│   ├── index.ts                 ← aggregates all db/ exports
│   ├── cashier.ts               ← simple entity (no cache, pass-through)
│   ├── extra/
│   │   ├── index.ts             ← barrel: exact mirror of sqlx/extra + revalidate
│   │   ├── cache.ts             ← Extra/ExtraFull types + CacheItem instance
│   │   ├── add-new.ts
│   │   ├── get-all.ts
│   │   ├── get-by-id.ts
│   │   ├── get-unsync-after.ts
│   │   ├── update.ts
│   │   ├── update-one-sync.ts
│   │   ├── update-many-sync-at.ts
│   │   ├── update-unsync-all.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   └── upsert-many-sync.ts
│   ├── image/                   ← composite-key cache (Map<productId, ImageFull[]>)
│   │   ├── index.ts             ← barrel: mirrors sqlx/image (public ops only) + revalidate
│   │   ├── cache.ts             ← Image/ImageFull types + cache object (get/set/update/getAll/revalidate)
│   │   ├── add-new.ts
│   │   ├── get-by-product-id.ts
│   │   ├── get-after.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   ├── update-swap.ts
│   │   ├── update-sync-many.ts
│   │   ├── update-unsync-all.ts
│   │   └── upsert-many-sync.ts
│   ├── method/
│   │   ├── index.ts             ← barrel: mirrors sqlx/method + revalidate
│   │   ├── cache.ts             ← Method/MethodFull types + CacheItem instance
│   │   ├── add-new.ts
│   │   ├── get-all.ts
│   │   ├── get-unsync-after.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   ├── update-name.ts
│   │   ├── update-many-sync-at.ts
│   │   ├── update-unsync-all.ts
│   │   └── upsert-many-sync.ts
│   └── ...
├── sqlx/
│   ├── index.ts                 ← aggregates all sqlx/ exports
│   ├── instance.ts              ← DB connection/setup (DB.execute, DB.select)
│   ├── extra/
│   │   ├── index.ts             ← barrel: nested namespace
│   │   ├── add.ts
│   │   ├── get-all.ts
│   │   ├── get-by-id.ts
│   │   ├── get-unsync-after.ts
│   │   ├── update.ts
│   │   ├── update-one-sync.ts
│   │   ├── update-many-sync-at.ts
│   │   ├── update-unsync-all.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   └── upsert-many-sync.ts
│   ├── image/
│   │   ├── index.ts
│   │   ├── add-new.ts
│   │   ├── get-by-product-id.ts
│   │   ├── get-max-order.ts
│   │   ├── get-order.ts
│   │   ├── get-product-id.ts
│   │   ├── get-many-product-id.ts
│   │   ├── get-unsync-after.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   ├── update-swap.ts
│   │   ├── update-many-sync-at.ts
│   │   ├── update-unsync-all.ts
│   │   └── upsert-many-sync.ts
│   ├── method/
│   │   ├── index.ts
│   │   ├── add-new.ts
│   │   ├── get-all.ts
│   │   ├── get-unsync-after.ts
│   │   ├── update.ts
│   │   ├── update-many-sync-at.ts
│   │   ├── update-unsync-all.ts
│   │   ├── del-by-id.ts
│   │   ├── del-many-sync.ts
│   │   └── upsert-many-sync.ts
│   └── ...
└── database-type.d.ts           ← DB namespace types
```

## Rules

1. **Application code imports from `db/` only.** Never import `sqlx/` directly outside of `db/`.
2. **`sqlx/` is pure SQL.** No caching, no composing other sqlx calls, no business logic.
3. **`db/` may compose multiple sqlx calls** if an operation spans tables or needs pre-fetched data (e.g., image delete resolving productId first).
4. **Cache invalidation is the responsibility of `db/`.** Every write operation must update the cache.
5. **`db/<entity>/index.ts` barrel exactly mirrors `sqlx/<entity>/index.ts`** plus a `revalidate` key. No backward-compat aliases, no extra sync-specific paths — one canonical path per operation.
6. **Timestamps are generated in `db/`** via `Date.now()` and passed down to `sqlx/`. `sqlx/` never calls `Date.now()`.
7. **Soft-delete pattern:** all read queries filter with `WHERE ..._deleted_at IS NULL`. Write queries set the column on soft-delete. The column is `null` on insert. The `get-unsync-after` query includes deleted rows and separates them into `{ exist, deleted }`.
8. **Batch operations** use dynamic `$${bindingIndex++}` placeholders wrapped in `BEGIN TRANSACTION;` / `COMMIT;` with a single flat bindings array via `flatMap`.
9. **File names are descriptive and match between sqlx and db.** e.g., `add-new.ts`, `del-many-sync.ts`, `get-unsync-after.ts`, `update-many-sync-at.ts`, `upsert-many-sync.ts`. Never use shortened names like `add.ts`, `del-sync.ts`, `get-after.ts`.
10. **db/ file names match sqlx/ file names exactly** except where sqlx has internal-only helpers (e.g., `get-order.ts`, `get-max-order.ts`, `get-product-id.ts` for image — these exist only in sqlx and are used internally by db operations, not re-exported in the db barrel).
11. **Template files with commented-out code are intentional** — they serve as scaffolding for future operations. Do not delete them (unless they have active broken code referencing non-existent sqlx paths).
12. **Single-entity caches use `CacheItem<T>`** from `~/lib/cache-factory`. **Composite-key caches use a raw `Map`** wrapped in an exported `cache` object with `get`, `set`, `update`, `getAll`, `revalidate` methods. Composite-key cache files must not import `CacheItem`.
13. **Image cache mutations on arrays use `immer/produce`** for swap and sync-many operations.
14. **Semantic update keys:** use descriptive keys like `update.name` instead of generic `update.one` when the operation targets a specific field subset.
