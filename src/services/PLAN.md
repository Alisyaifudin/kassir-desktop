# Services Refactor Plan

Replacing the legacy `src/database/` layer with Effect services that match the
post-`migration-43` schema (product decomposition + `*_deleted_at` soft delete).

This document is the agreed plan **before** any `live.ts` is written. Interfaces
live in each service's `index.ts`; implementations in `live.ts` (see
`.pi/skills/services.md`).

---

## 0. Context (current state)

| Area | State |
|---|---|
| `src/services/db|store|local-storage` | hidden backends, unchanged |
| `src/services/config|cashier|auth|info` | done |
| `src/services/customer` | **stale**: still does `DELETE` + `graves` insert; migration-43 removes `graves`, adds `customer_deleted_at` |
| `src/database/*` | legacy Effect-but-not-service data layer; ~all pages depend on it |
| `src/lib/result.ts` | legacy `Result.use` hook; pages still use it |
| `src/transaction/*` | separate `tx.db` POS cart persistence (not part of `data.db`) |
| `src/lib/sync/*` | stale (imports removed `~/store`); needs rework after services |
| Pages | nearly all still `~/database` + `Result`; not migrated |

**Hard constraints discovered**

1. sqlx runs each migration in a transaction and the app relies on
   `BEGIN; …; COMMIT;` inside a **single** `db.execute(...)` string. There is no
   per-connection transaction API on `@tauri-apps/plugin-sql`. Cross-table atomic
   writes must therefore be one multi-statement execute.
2. `SubscriptionRef` model needs one in-memory value per service. Records are
   ~64k rows and are always queried by range/filter/pagination → they do **not**
   fit a "load everything into a ref" model.
3. Child tables (`stocks`, `listings`, `codes`, images, record children) have no
   tombstones by design: they ride the parent aggregate.
4. New PKs from the app are ULIDs (`generateId()`); existing rows are numeric
   strings. Both are valid text.

---

## 1. Principles applied

- One `SubscriptionRef` per service; mutations write DB **then** ref.
- **Aggregates are allowed and expected** — a service may own several tables.
- Soft delete = set `*_deleted_at`; rows stay in the DB for sync.
- Queried/unbounded domains (records, reports) expose **Effect query methods**
  plus a `revision` stream, not a full-list ref.
- A service that can be changed out-of-band exposes `refresh()` (justified;
  the record commit changes product stock).
- `index.ts` describes the contract only; `live.ts` carries implementation notes.

---

## 2. Service catalog

Legend: **owns** = tables the service is the only writer of.

| # | Service | Owns (tables) | Depends on | Status |
|---|---|---|---|---|
| — | `db` (hidden) | — | — | keep, extend |
| — | `store` (hidden) | — | — | keep |
| — | `local-storage` (hidden) | — | — | keep |
| 1 | `config` | localStorage `size` | local-storage | keep |
| 2 | `auth` | localStorage `user` | local-storage, cashier | keep |
| 3 | `cashier` | `cashiers` | db | keep |
| 4 | `info` | store keys | store | keep |
| 5 | `customer` | `customers` | db | **update soft-delete** |
| 6 | `method` | `methods` | db | new |
| 7 | `extra` | `extras` | db | new |
| 8 | `social` | `socials` | db | new |
| 9 | `money` | `money`, `money_kind` | db | new |
| 10 | `product` | `products`, `stocks`, `listings`, `codes`, `images`, `product_events` | db | new (big) |
| 11 | `record` | `records`, `record_methods`, `record_listings`, `discounts`, `record_extras` | db, product | new (big) |
| 12 | `report` | — (read-only joins) | db | new |
| 13 | `sync` | — (orchestrator) | all public | later |

`product_events` is owned by `product` (stock rollback log); `record` writes to
it only through the product/stock API in the same SQL batch.

---

## 3. Interfaces

Shared primitives:

```ts
type Meta = { updatedAt: number; syncAt: number | null };
type SyncMeta = Meta & { deletedAt: number | null };
```

### 3.1 `db` (hidden, extended)

```ts
export type Statement = { sql: string; bindings?: Binding[] };

export class DatabaseService ... {
  execute: (query, bindings) => Effect<void, DbError>;
  selectMany: <T>(query, bindings?) => Effect<T[], DbError>;
  selectOne: <T>(query, bindings?) => Effect<T, DbError | NotFound>;
  /** One connection, one transaction: BEGIN; …; COMMIT (or ROLLBACK). */
  transaction: (statements: Statement[]) => Effect<void, DbError>;
}
```

`transaction` exists because plugin-sql has no connection handle; it joins the
statements into one `execute` string. Services that need atomic cross-table
writes (record commit/rollback) use it and share pure SQL-builder helpers.

### 3.2 `customer` (updated)

```ts
export type Customer = { id: string; name: string; phone: string };
export type CustomerFull = Customer & SyncMeta;

CustomerService: {
  get: { all(); unsync(); byId(id); changes: Stream<Customer[]> };
  add(name, phone) => string;
  set: { info(id, {name, phone}); sync(id); syncMerge(c: CustomerFull) };
  delete: { byId(id); sync(id) };  // sets customer_deleted_at, not DELETE
}
```

### 3.3 `method`, `extra`, `social`

Same shape:

```ts
type Method = { id; name: string | null; kind: MethodKind; deletedAt: number | null };

MethodService: {
  get: { all(); unsync(); changes };
  add({ kind, name? }) => string;
  set: { name(id, name); kind(id, kind); sync(id); syncMerge(m) };
  delete: { byId(id); sync(id) };            // sets method_deleted_at
}

type Extra = { id; name; value; kind: ValueKind; flag: number; deletedAt: number | null };
ExtraService: { get:{all,unsync,byId,changes}; add(input); set:{info,sync,syncMerge}; delete:{byId,sync} }

type Social = { id; name; value; deletedAt: number | null };
SocialService: { get:{all,unsync,changes}; add(name,value); set:{info,sync,syncMerge}; delete:{byId,sync} }
```

`extra.flag` semantics TBD — carried through opaquely.

### 3.4 `money` (owns kinds + entries)

```ts
type MoneyKind = { id; name; type: "absolute" | "change"; ordering: number; deletedAt };
type MoneyEntry = { id; timestamp; value; kindId; note; deletedAt };
type Balance = { kindId; balance: number };

MoneyService: {
  kinds: {
    get: { all(); changes: Stream<MoneyKind[]> };
    add({ name, type }) => string;
    set: { name(id,name); type(id,type); ordering(id,n); sync(id); syncMerge(k) };
    delete: { byId(id); sync(id) };
  };
  entries: {
    get: { all(); byRange(start,end); last(); unsync(); changes: Stream<MoneyEntry[]> };
    add({ timestamp, value, kindId, note }) => string;
    set: { sync(id); syncMerge(e) };
    delete: { byId(id); sync(id) };
  };
  balances(): Effect<Balance[]>;   // derived from entries + kind.type
}
```

Open: keep `money_kind` as a sibling service instead? (see §6 Q1.)

### 3.5 `product` (aggregate)

```ts
export type ValueKind = "number" | "percent";

export type Listing = { id; productId; name; price; unit; kind: string; updatedAt };
export type Code    = { id; productId; listingId: string | null; value; kind: "barcode"|"qr"; updatedAt };
export type Image   = { id; productId; order; name; mime; updatedAt };
export type Stock   = { id; productId; value; capital; createdAt; updatedAt };

/** List/POS read model */
export type Product = {
  id; name; note;
  listings: Listing[];
  codes: Code[];
  stock: number;      // derived: sum(lots.value)
  capital: number;    // derived: weighted average of lots
  updatedAt; syncAt; deletedAt;
};

/** Detail read model */
export type ProductFull = Product & { images: Image[]; stocks: Stock[] };

export type ProductInput = {
  name; note;
  listings: { name; price; unit; kind }[];
  codes?: { value; kind; listingIndex?: number }[];
  stock?: { value; capital };
};

ProductService: {
  get: {
    all(): Effect<Product[]>;
    byId(id): Effect<ProductFull | NotFound>;
    byCode(value): Effect<Product[]>;      // scan barcode/qr
    unsync(): Effect<Product[]>;
    changes: Stream<Product[]>;
  };
  add(input: ProductInput) => Effect<string, DuplicateError>;
  set: {
    info(id, { name, note });
    listing: {
      add(productId, input) => string;
      update(listingId, patch);
      remove(listingId);
    };
    code: { add(productId, input) => string; remove(codeId) };
    image: { add(productId, input) => string; remove(imageId); swap(aId, bId) };
  };
  /** stock lot operations; also used (via pure SQL builders) by `record` */
  stock: {
    lots(productId): Effect<Stock[]>;
    receive(productId, { pcs, capital });   // new lot + inc event
    consume(productId, { pcs });            // FIFO across lots + dec events
    set(productId, lots: { value; capital }[]); // manual correction
    history(productId, { before, limit });  // product_events, for the UI
  };
  delete: { byId(id); sync(id) };           // sets product_deleted_at
  sync: { upsert(server: ProductServer); syncAt(id, at) };
  refresh(): Effect<void>;                   // re-hydrate after record commit
}
```

Notes:
- `add` inserts product + at least one listing + optional codes + one stock lot
  in a single `transaction`.
- `delete.byId` soft-deletes the product; children cascade physically? No —
  children have no tombstones, so the aggregate simply stops returning them and
  the product row stays.
- `consume` FIFO orders lots by `stock_created_at`.

### 3.6 `record` (aggregate)

```ts
type RecordMode = "incoming" | "outcoming";

type RecordListing = {
  id; listingId: string | null; recordId; name; kind; price; qty; capital; total;
  discounts: Discount[];
};
type Discount = { id; kind: DiscKind; value; eff };
type RecordExtra = { id; name; value; eff; kind: ValueKind };
type RecordMethod = { id; methodId: string; pay: number; name?: string; methodKind?: MethodKind };

type Record = {
  id; paidAt; rounding; isCredit: boolean; cashier; mode: RecordMode;
  pay; note; fix;
  customer: { name; phone };
  subTotal; total; grandTotal; change;   // grandTotal = total + rounding
  methods: RecordMethod[];               // split payment
  updatedAt; syncAt; deletedAt;
};
type RecordFull = Record & { listings: RecordListing[]; extras: RecordExtra[] };

RecordService: {
  get: {
    byRange(start, end): Effect<Record[]>;
    byId(id): Effect<RecordFull | NotFound>;
    debt(): Effect<{ id; paidAt; note; fix; total }[]>;
    unsync(): Effect<Record[]>;
    revision: Stream<number>;   // bumps on any write; pages re-query on it
  };
  count: {
    byRange(start, end): Effect<{ incoming: number; outcoming: number }>;
    total(start, end, mode): Effect<number>;
    unsync(): Effect<number>;
  };
  add: {
    one(input: CommitInput) => Effect<{ id: string; change: number; grandTotal: number },
                                      RecordError | StockError>;
    external(import: RecordImport) => Effect<void>;
  };
  set: {
    paidAt(id, at); note(id, note); mode(id, mode);
    methods(id, { methodId; pay }[]);   // replaces record_methods, updates record_pay
    toCredit(id); payCredit(id);
  };
  delete: { byId(id); sync(id) };
  sync: { upsert(server); syncAt(id, at) };
}

type CommitInput = {
  mode: RecordMode; note; fix; rounding;
  methods: { methodId: string; pay: number }[];
  customer: { id?: string; name; phone };
  listings: {
    listingId?: string; productId?: string; name; kind; price; qty; capital;
    discounts: { kind: DiscKind; value; eff }[];
  }[];
  extras: { name; value; eff; kind: ValueKind }[];
};
```

`add.one` is one `transaction`:
1. insert `records`
2. insert `record_listings` + `discounts`
3. insert `record_extras`
4. insert `record_methods`
5. stock: for `outcoming` consume, for `incoming` receive; insert `product_events`
6. bump `record.revision`
7. `product.refresh()`

`delete.byId` is one `transaction`:
1. set `record_deleted_at`
2. reverse stock from `product_events` for that record (restore lots)
3. bump revision + `product.refresh()`

### 3.7 `report` (read-only)

```ts
ReportService: {
  cashflow(range, bucket): Effect<Point[]>;
  net(range, bucket): Effect<Point[]>;
  crowd(range, bucket): Effect<Point[]>;
  productPerformance(range, { limit, sort, query }): Effect<ProductPerf[]>;
  extraPerformance(range): ...
}
```
All read-only joins across `records`/`record_listings`/`record_extras`/`money`.

### 3.8 `sync` (later)

Orchestrates the aggregate push/pull from §SYNC CONTRACT in `migration-43.sql`,
using the services' `get.unsync` / `sync.upsert` / `syncAt` methods. Out of scope
for the first implementation pass.

---

## 4. Layer graph

```
hidden = Layer.mergeAll(DatabaseLive, StoreLive, LocalStorageLive)

config  ← hidden
info    ← hidden
cashier ← hidden
customer← hidden
method  ← hidden
extra   ← hidden
social  ← hidden
money   ← hidden
product ← hidden
record  ← hidden + product
report  ← hidden
auth    ← hidden + cashier
sync    ← (all public)
```

`service = { config, auth, cashier, info, customer, method, extra, social,
money, product, record, report }`.

---

## 5. Cross-cutting decisions

1. **`db.transaction(statements)`** — join into one `execute`:
   `BEGIN; <stmt>; …; COMMIT;`. Used by `product.add`, `record.add.one`,
   `record.delete.byId`, etc. Rollback on error is implicit (multi-statement
   failure aborts the transaction).
2. **Stock SQL builders are pure functions** in `src/services/product/stock-sql.ts`
   (build "consume/receive/restore" statements from lots), so both `product` and
   `record` compose them without duplicating FIFO logic.
3. **Cross-aggregate invalidation**: `product.refresh()` after record writes.
   (The one justified exception to "never expose revalidate".)
4. **Queried domains**: `record`/`report` return Effects; pages subscribe with
   `useStream(Stream.fromEffect(effect))` keyed on params + `record.revision`.
   A small `useQuery(effect, deps, revision)` helper may be added to
   `Loader.tsx` (open Q4).
5. **Soft-delete reads**: `get.all` filters `deleted_at IS NULL`; `get.unsync`
   returns everything (incl. deleted) for sync.
6. **IDs**: `generateId()` (ULID) in all `add` methods.
7. **`src/transaction` (tx.db)** stays as-is for now; the cart is a separate
   concern from committed records (open Q6).

---

## 6. Phased implementation

- **Phase 1 — foundation**
  `db.transaction`; update `customer`; add `method`, `extra`, `social`, `money`;
  wire into `services/index.ts`. (Old `~/database` still works in parallel.)
- **Phase 2 — product**
  `src/services/product/{index,live,stock-sql}.ts`; unit-test FIFO + capital.
- **Phase 3 — record**
  `src/services/record/{index,live,commit}.ts`; commit + rollback + revision.
- **Phase 4 — report**
  Move the Analytics queries out of the page `use-data.ts` files.
- **Phase 5 — sync**
  Rebuild `src/lib/sync` on top of the services (or a `sync` service).
- **Phase 6 — page migration**
  Convert pages one-by-one from `~/database` + `Result` to `useStream`/`Loader`.
- **Phase 7 — cleanup**
  Delete `src/database`, old `src/lib/sync`, `src/lib/result.ts`, `graves` code.

Phases 1–3 are the core; 4–7 can proceed independently once interfaces freeze.

---

## 7. Open questions

1. **`money`**: one service owning `money` + `money_kind` (proposed), or split
   into `money` and `moneyKind`?
2. **Product list read model**: always include `listings` + `codes`, and load
   `images`/`stocks` only in `byId`? (proposed yes) — images are the heavy part.
3. **Records size**: confirm the `revision` + query-Effect approach instead of a
   full-list `SubscriptionRef`.
4. **`useQuery` helper**: add a params-aware, revision-aware stream hook to
   `Loader.tsx`, or keep query pages on `Stream.fromEffect` + manual re-subscribe?
5. **`extra_flag`**: meaning unknown — treat as opaque `number` for now?
6. **POS cart (`tx.db`)**: leave `src/transaction` untouched this pass, or also
   fold into a `cart` service?
7. **`report` in scope now**, or defer until after product+record?
8. **Stock costing**: confirm FIFO by `stock_created_at`, and that the product's
   displayed `capital` is the weighted average across lots.
9. **`record.listings[].listingId`**: when a POS line is manual (no catalog
   listing), keep `listingId = null` and snapshot name/price/kind (proposed).
