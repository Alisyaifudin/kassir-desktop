# addNewRecord

Creates a new record (transaction) with products, extras, and optional customer. Builds and executes a single SQL transaction.

## Entry Point

```typescript
addNewRecord(tx: TxRecord, now: number) → Effect<never, Errors, string>
```

Returns `recordId` on success.

---

## Types

### `TxRecord`

| Field | Type | Description |
|---|---|---|
| `methodId` | `string` | Payment method |
| `paidAt` | `number` | Timestamp of payment |
| `createdAt` | `number` | Record creation timestamp |
| `rounding` | `number` | Rounding adjustment |
| `creditAt` | `number?` | Credit due timestamp |
| `cashier` | `string` | Cashier name |
| `mode` | `DB.Mode` | `"in"` (buy) or `"out"` (sell) |
| `pay` | `number` | Amount paid |
| `note` | `string` | Record note |
| `fix` | `number` | Fixed adjustment |
| `customer` | `{ name, phone }?` | Optional customer info |
| `subtotal` | `number` | Subtotal before adjustments |
| `total` | `number` | Final total |
| `products` | `RecordProduct[]` | Products in this record |
| `extras` | `RecordExtra[]` | Extra charges/discounts |

### `RecordProduct`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | record_product_id (pre-generated) |
| `product` | discriminated union | See below |
| `name` | `string` | Product name |
| `price` | `number` | Unit price |
| `qty` | `number` | Quantity |
| `capital` | `number` | Capital per unit |
| `total` | `number` | Line total |
| `discounts` | `Discount[]` | Line-level discounts |

**`product` union:**

| `_tag` | Fields | Description |
|---|---|---|
| `"update"` | `id: string` | Existing product (update name/price) |
| `"new"` | `codes: string[]` | New product (create products + product_codes) |

### `Discount`

| Field | Type |
|---|---|
| `id` | `string` |
| `value` | `number` |
| `eff` | `number` |
| `kind` | `DB.DiscKind` |

### `RecordExtra`

| Field | Type |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `value` | `number` |
| `eff` | `number` |
| `kind` | `DB.ValueKind` |

---

## Flow

```
addNewRecord
│
├─ 1. preCheckUniqueIds          (sequential, no DB)
│     ├─ Duplicate record_product_id?
│     ├─ Duplicate product.id (for _tag="update")?
│     ├─ Duplicate discount.id?
│     └─ Duplicate extra.id?
│
├─ 2. Parallel (Effect.all, unbounded concurrency)
│     ├─ fetchExistingCapitals   (DB read)
│     ├─ checkBasics             (no DB)
│     ├─ checkInputCodes         (no DB)
│     └─ checkDbCodes            (DB read)
│
├─ 3. buildTransaction           (pure, builds SQL)
│
└─ 4. DB.execute(sql, bindings)  (single transaction)
```

---

## Pre-check Phase

### 1. `preCheckUniqueIds` — ID Uniqueness

Validates that all entry IDs are unique within their domain. Runs sequentially (fast, no DB).

| Check | Field | Error type |
|---|---|---|
| Duplicate `products[].id` | `record_product` | `DuplicateEntryId` |
| Duplicate `product.id` where `_tag="update"` | `product` | `DuplicateEntryId` |
| Duplicate `discounts[].id` across all products | `discount` | `DuplicateEntryId` |
| Duplicate `extras[].id` | `extra` | `DuplicateEntryId` |

### 2. `checkBasics` — Non-empty & Valid Quantities

- If `products.length === 0 && extras.length === 0` → `EmptyTransaction`
- If any `product.qty <= 0` → `InvalidQuantity` with indices

### 3. `checkInputCodes` — Input Code Collisions

For new products only (`_tag="new"`):
- Deduplicate codes per product (`[...new Set(codes)]`)
- If same code appears in 2+ products → `InputCodeCollision`

### 4. `checkDbCodes` — Database Code Checks

For new products only:
- Query `product_codes` for all incoming codes
- If code already exists in DB → `DbCodeCollision` (code belongs to existing product)

### 5. `fetchExistingCapitals` — Capital Lookup

For existing products (`_tag="update"`):
- Query `capitals` where `product_id IN (...)` and `capital_deleted_at IS NULL`
- Returns `Map<productId, CapitalRow[]>`

---

## SQL Builder

Builds a single transaction string. Executes all queries atomically.

### Customer Upsert

If `tx.customer` provided:
```sql
INSERT INTO customers (...)
VALUES (...)
ON CONFLICT (customer_id) DO UPDATE SET ...;
```

### Record Insert

```sql
INSERT INTO records (record_id, record_created_at, timestamp, record_rounding,
  record_credit_at, record_cashier, record_mode, record_pay, record_note,
  method_id, record_fix, record_sub_total, record_total,
  record_updated_at, record_sync_at, customer_id)
VALUES (...);
```

### Record Extras

For each extra:
```sql
INSERT INTO record_extras (record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind)
VALUES (...);
```

### Per-Product Loop

#### New Product (`_tag="new"`)

1. `INSERT INTO products` (name, price, note='')
2. `INSERT INTO product_codes` for each code (after dedup)
3. `INSERT INTO capitals` (stock=qty, capital=product.capital)

#### Existing Product (`_tag="update"`)

1. `UPDATE products` — always updates name and updated_at; also updates price if `mode="in"`
2. Capital handling:
   - **Match found** (same `capital_capital`): `UPDATE capitals SET capital_stock += qty`
   - **No match**: `INSERT INTO capitals` (new capital row)

#### Always (both branches)

1. `INSERT INTO product_events` — value is `+qty` for `"in"`, `-qty` for `"out"`
2. `INSERT INTO record_products` — links event to record
3. `INSERT INTO discounts` for each discount

---

## Error Types

| Error | `_tag` | Payload |
|---|---|---|
| `EmptyTransaction` | `"EmptyTransaction"` | `msg: string` |
| `InvalidQuantity` | `"InvalidQuantity"` | `productIndices: number[]` |
| `DuplicateEntryId` | `"DuplicateEntryId"` | `type: DuplicateEntryType`, `duplicates: { id, indices }[]` |
| `InputCodeCollision` | `"InputCodeCollision"` | `collisions: { code, fromId, toId }[]` |
| `DbCodeCollision` | `"DbCodeCollision"` | `collisions: { code, incomingProductId, existingProductName }[]` |

### `DuplicateEntryType`

```typescript
type DuplicateEntryType = "record_product" | "product" | "discount" | "extra";
```

---

## Key Decisions

1. **Customer upsert inside transaction** — ensures atomicity, no orphaned customer rows on failure.

2. **Codes always optional** — new products can have zero codes; product management screen can add later.

3. **Deduplicate codes silently** — duplicate codes within same product are deduped before collision checks.

4. **Event value sign** — `"in"` (buy) = positive qty (stock increase), `"out"` (sell) = negative qty (stock decrease).

5. **Capital accumulation** — matching `capital_capital` row gets `stock += qty`; no match creates new capital row.

6. **Product update on "in"** — updates both `product_name` and `product_price`. On "out", only `product_name`.
