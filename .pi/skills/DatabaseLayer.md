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

- One file per table/entity (e.g., `sqlx/customer/`, `sqlx/cashier/`).
- Each file exports raw functions that run SQL via the `DB` instance.
- **No business logic, no caching, no side effects beyond the query.**
- Functions receive primitive params or plain objects, return `Effect<T>`.
- Naming convention: `getAllCustomers()`, `addNewCustomer()`, `updateCustomer()`, `deleteCustomerById()`.

**Example — `sqlx/customer/add.ts`:**
```ts
import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";

export function addNewCustomer(name: string, phone: string, now: number) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at) 
     VALUES ($1, $2, $3, $4, null)`,
    [id, name, phone, now],
  ).pipe(Effect.as(id));
}
```

**Key rules:**
- Only raw SQL and `DB.execute` / `DB.select`.
- Accepts all parameters explicitly (even timestamps — callers generate `Date.now()`).
- Returns raw DB results or mapped objects (e.g., mapping `customer_name` → `name`).

---

### `db/` — ORM-like Layer

- One directory per entity (e.g., `db/customer/`, `db/product/`), or a single file for simple entities (`db/cashier.ts`).
- Each file **composes** one or more `sqlx` calls.
- **Adds caching** via `CacheItem<T>`.
- **All application code consumes this layer, never `sqlx` directly.**

**Pattern — entity with caching:**

```ts
// db/customer/index.ts
import { addNewCustomer } from "./add";
import { getAll } from "./get-all";
import { update } from "./update";
import { delById } from "./del-by-id";
import { cache } from "./cache";

export const customer = {
  get: { all: getAll },
  add: { one: addNewCustomer },
  update: { one: update },
  del: { byId: delById },
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

| Method | Behavior |
|--------|----------|
| `set(items: T[])` | Replaces entire cache |
| `get(id: string)` | Returns single item or `undefined` |
| `all()` | Returns `T[]` or `null` if cache is empty |
| `update(id, item: T)` | Full replacement of cache entry |
| `update(id, cb: (item: T) => T)` | Callback-based update (skips if item missing) |
| `delete(id)` | Removes entry |
| `revalidate()` | Clears the cache |

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
export function getAll() {
  const cached = cache.all();
  if (cached !== null) return Effect.succeed(cached);
  return sqlx.customer.get.all().pipe(
    Effect.tap((rows) => cache.set(rows)),
  );
}
```

**Add (write-through):**
```ts
export function addNewCustomer(name: string, phone: string) {
  const now = Date.now();
  return sqlx.customer.add.one(name, phone, now).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, phone, updatedAt: now, syncAt: undefined });
    }),
  );
}
```

**Update (write-through):**
```ts
export function update({ id, name, phone }: { id: string; name: string; phone: string }) {
  const now = Date.now();
  return sqlx.customer.update.one({ id, name, phone, now }).pipe(
    Effect.tap(() => {
      cache.update(id, { id, name, phone, updatedAt: now, syncAt: undefined });
    }),
  );
}
```

**Delete (write-through):**
```ts
export function delById(id: string) {
  return sqlx.customer.delete.byId(id).pipe(
    Effect.tap(() => cache.delete(id)),
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
│   │   ├── add.ts         ← create operation
│   │   ├── get-all.ts     ← list operation
│   │   ├── update.ts      ← update operation
│   │   ├── del-by-id.ts   ← delete operation
│   │   ├── sync.ts        ← sync operation (optional)
│   │   └── upsert.ts      ← upsert operation (optional)
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
│   └── ...
└── migrations/            ← SQL migration files
```

## Rules

1. **Application code imports from `db/` only.** Never import `sqlx/` directly outside of `db/`.
2. **`sqlx/` is pure SQL.** No caching, no composing other sqlx calls, no business logic.
3. **`db/` may compose multiple sqlx calls** if an operation spans tables.
4. **Cache invalidation is the responsibility of `db/`.** Every write operation must update the cache.
5. **Template files with commented-out code are intentional** — they serve as scaffolding for future operations. Do not delete them.
6. **Timestamps are generated in `db/`** and passed down to `sqlx/`. `sqlx/` never calls `Date.now()`.
