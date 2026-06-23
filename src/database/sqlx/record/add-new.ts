import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";
import { createBindings } from "~/lib/bind";
import {
  EmptyTransaction,
  InputCodeCollision,
  type InputCodeCollisionEntry,
  DbCodeCollision,
  type DbCodeCollisionEntry,
  InvalidQuantity,
  DuplicateEntryId,
  type DuplicateIdEntry,
} from "~/lib/effect-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecordExtra = {
  id: string;
  name: string;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

type Discount = {
  id: string;
  value: number;
  eff: number;
  kind: DB.DiscKind;
};

type RecordProduct = {
  id: string;
  product:
    | {
        _tag: "update";
        id: string;
      }
    | {
        _tag: "new";
        codes: string[];
      };
  name: string;
  price: number;
  qty: number;
  capital: number;
  total: number;
  discounts: Discount[];
};

export type NewRecord = {
  methodId: string;
  paidAt: number;
  createdAt: number;
  rounding: number;
  creditAt?: number;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  note: string;
  fix: number;
  customer?: {
    name: string;
    phone: string;
  };
  subtotal: number;
  total: number;
  products: RecordProduct[];
  extras: RecordExtra[];
};

type CapitalRow = {
  capital_id: string;
  capital_stock: number;
  capital_capital: number;
};

// ---------------------------------------------------------------------------
// Pre-check helpers
// ---------------------------------------------------------------------------

/** Step 1: Validate the transaction has content and quantities are valid. */
function checkBasics(products: RecordProduct[], extras: RecordExtra[]) {
  return Effect.gen(function* () {
    if (products.length === 0 && extras.length === 0) {
      return yield* EmptyTransaction.fail(
        "Transaksi harus memiliki minimal satu produk atau extra",
      );
    }
    const invalidIndices = products.map((p, i) => (p.qty <= 0 ? i : -1)).filter((i) => i !== -1);
    if (invalidIndices.length > 0) {
      return yield* InvalidQuantity.fail(invalidIndices);
    }
  });
}

/** Pre-check: Validate that all entry IDs are unique across their respective domains. */
function preCheckUniqueIds(products: RecordProduct[], extras: RecordExtra[]) {
  return Effect.gen(function* () {
    // Check record_product_id (tx.products.id)
    const rpDuplicates = findDuplicates(products.map((p) => p.id));
    if (rpDuplicates.length > 0) {
      return yield* DuplicateEntryId.fail("record_product", rpDuplicates);
    }

    // Check product.id for existing products (_tag === "update")
    const updateProductIds = products.flatMap((p) =>
      p.product._tag === "update" ? [p.product.id] : [],
    );
    const prodDuplicates = findDuplicates(updateProductIds);
    if (prodDuplicates.length > 0) {
      return yield* DuplicateEntryId.fail("product", prodDuplicates);
    }

    // Check discount IDs across all products
    const discountDuplicates = findDuplicates(
      products.flatMap((p) => p.discounts.map((d) => d.id)),
    );
    if (discountDuplicates.length > 0) {
      return yield* DuplicateEntryId.fail("discount", discountDuplicates);
    }

    // Check extra IDs (tx.extras.id)
    const extraDuplicates = findDuplicates(extras.map((e) => e.id));
    if (extraDuplicates.length > 0) {
      return yield* DuplicateEntryId.fail("extra", extraDuplicates);
    }
  });
}

/** Find duplicate IDs in a list, returning each ID with its duplicate indices. */
function findDuplicates(ids: string[]): DuplicateIdEntry[] {
  const idMap = new Map<string, number[]>();
  for (let i = 0; i < ids.length; i++) {
    const indices = idMap.get(ids[i]) ?? [];
    indices.push(i);
    idMap.set(ids[i], indices);
  }
  const duplicates: DuplicateIdEntry[] = [];
  for (const [id, indices] of idMap) {
    if (indices.length > 1) {
      duplicates.push({ id, indices });
    }
  }
  return duplicates;
}

/** Step 2: Check for duplicate codes across different products within the input. */
function checkInputCodes(products: RecordProduct[]) {
  return Effect.gen(function* () {
    const codeMap = new Map<string, string>(); // code → first record productId
    const collisions: InputCodeCollisionEntry[] = [];
    for (const product of products) {
      if (product.product._tag === "update") continue;
      const deduped = [...new Set(product.product.codes)];
      for (const code of deduped) {
        const existing = codeMap.get(code);
        if (existing !== undefined && existing !== product.id) {
          collisions.push({ code, fromId: existing, toId: product.id });
        } else {
          codeMap.set(code, product.id);
        }
      }
    }

    if (collisions.length > 0) {
      return yield* InputCodeCollision.fail(collisions);
    }
  });
}

/** Step 3: Check code collisions/mismatches against the database. */
function checkDbCodes(products: RecordProduct[]) {
  const allCodes = products.flatMap((p) =>
    p.product._tag === "update" ? [] : [...new Set(p.product.codes)],
  );
  if (allCodes.length === 0) return Effect.void;

  return Effect.gen(function* () {
    const { bind: bindCodes, bindings: codeBindings } = createBindings();
    const placeholders = allCodes.map((c) => bindCodes(c)).join(", ");
    const dbRows = yield* DB.select<{ product_code: string; product_name: string }[]>(
      `SELECT product_code, product_name FROM product_codes WHERE product_code IN (${placeholders})
      INNER JOIN products ON products.product_id = product_codes.product_id`,
      codeBindings,
    );

    // Build map: code → product_name
    const dbCodeMap = new Map(dbRows.map((r) => [r.product_code, r.product_name]));

    // 3a: DbCodeCollision — code belongs to a different product
    const collisions: DbCodeCollisionEntry[] = [];
    for (const product of products) {
      if (product.product._tag === "update") continue;
      const deduped = [...new Set(product.product.codes)];
      for (const code of deduped) {
        const dbProductName = dbCodeMap.get(code);
        if (dbProductName !== undefined) {
          collisions.push({
            code,
            incomingProductId: product.id,
            existingProductName: dbProductName,
          });
        }
      }
    }
    if (collisions.length > 0) {
      return yield* DbCodeCollision.fail(collisions);
    }
  });
}

// ---------------------------------------------------------------------------
// Pre-check: Fetch existing capitals (grouped by product_id)
// ---------------------------------------------------------------------------

function fetchExistingCapitals(products: RecordProduct[]) {
  return Effect.gen(function* () {
    const productIds = products.flatMap((p) => (p.product._tag === "new" ? [] : [p.product.id]));
    if (productIds.length === 0) return new Map<string, CapitalRow[]>();

    const { bind: b, bindings } = createBindings();
    const placeholders = productIds.map((id) => b(id)).join(", ");
    const rows = yield* DB.select<
      { capital_id: string; capital_stock: number; capital_capital: number; product_id: string }[]
    >(
      `SELECT capital_id, capital_stock, capital_capital, product_id
       FROM capitals
       WHERE product_id IN (${placeholders}) AND capital_deleted_at IS NULL`,
      bindings,
    );

    const map = new Map<string, CapitalRow[]>();
    for (const row of rows) {
      const list = map.get(row.product_id) ?? [];
      list.push({
        capital_id: row.capital_id,
        capital_stock: row.capital_stock,
        capital_capital: row.capital_capital,
      });
      map.set(row.product_id, list);
    }
    return map;
  });
}

// ---------------------------------------------------------------------------
// SQL Builder
// ---------------------------------------------------------------------------

function buildTransaction(
  tx: NewRecord,
  now: number,
  recordId: string,
  capitalsByProduct: Map<string, CapitalRow[]>,
): { sql: string; bindings: unknown[] } {
  const { bind, bindings } = createBindings();
  const queries: string[] = [];

  // --- Customer upsert (inside transaction for atomicity) ---
  let customerId: string | null = null;
  if (tx.customer) {
    customerId = generateId();
    queries.push(
      `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at)
       VALUES (${bind(customerId)}, ${bind(tx.customer.name)}, ${bind(tx.customer.phone)}, ${bind(now)}, ${bind(null)})
       ON CONFLICT (customer_id) DO UPDATE SET
         customer_name = excluded.customer_name,
         customer_phone = excluded.customer_phone,
         customer_updated_at = excluded.customer_updated_at,
         customer_sync_at = null;`,
    );
  }

  // --- INSERT record ---
  queries.push(
    `INSERT INTO records
       (record_id, record_created_at, timestamp, record_rounding,
        record_credit_at, record_cashier, record_mode, record_pay, record_note,
        method_id, record_fix, record_sub_total, record_total,
        record_updated_at, record_sync_at, customer_id)
     VALUES (${bind(recordId)}, ${bind(now)}, ${bind(tx.paidAt)}, ${bind(tx.rounding)},
       ${bind(tx.creditAt ?? null)}, ${bind(tx.cashier)}, ${bind(tx.mode)}, ${bind(tx.pay)}, ${bind(tx.note)},
       ${bind(tx.methodId)}, ${bind(tx.fix)}, ${bind(tx.subtotal)}, ${bind(tx.total)},
       ${bind(now)}, ${bind(null)}, ${bind(customerId)});`,
  );

  // --- INSERT record_extras ---
  for (const extra of tx.extras) {
    queries.push(
      `INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, record_extra_value, record_extra_eff, record_extra_kind)
       VALUES (${bind(extra.id)}, ${bind(extra.name)}, ${bind(recordId)}, ${bind(extra.value)}, ${bind(extra.eff)}, ${bind(extra.kind)});`,
    );
  }

  // --- Per product ---
  for (const product of tx.products) {
    const eventNote = tx.mode === "in" ? "Sell product" : "Buy product";
    const eventValue = tx.mode === "in" ? -product.qty : product.qty;

    let productId: string;
    let capitalId: string;

    if (product.product._tag === "new") {
      // --- New product (Branch C from spec) ---
      productId = generateId();

      // INSERT products
      queries.push(
        `INSERT INTO products (product_id, product_name, product_price, product_note, product_updated_at, product_sync_at)
         VALUES (${bind(productId)}, ${bind(product.name)}, ${bind(product.price)}, ${bind("")}, ${bind(now)}, ${bind(null)});`,
      );

      // INSERT product_codes (if any)
      const dedupedCodes = [...new Set(product.product.codes)];
      for (const code of dedupedCodes) {
        queries.push(
          `INSERT INTO product_codes (product_code, product_id) VALUES (${bind(code)}, ${bind(productId)});`,
        );
      }

      // INSERT capital (new)
      capitalId = generateId();
      queries.push(
        `INSERT INTO capitals (capital_id, capital_stock, capital_capital, capital_updated_at, capital_sync_at, product_id)
         VALUES (${bind(capitalId)}, ${bind(product.qty)}, ${bind(product.capital)}, ${bind(now)}, ${bind(null)}, ${bind(productId)});`,
      );
    } else {
      // --- Existing product ---
      productId = product.product.id;
      // --- update the products
      if (tx.mode === "in") {
        queries.push(
          `UPDATE products SET product_name = ${bind(product.name)}, product_price = ${bind(product.price)},
          product_updated_at = ${bind(now)}, product_sync_at = null WHERE product_id = ${bind(productId)};`,
        );
      } else {
        queries.push(
          `UPDATE products SET product_name = ${bind(product.name)}, product_updated_at = ${bind(now)}, 
          product_sync_at = null WHERE product_id = ${bind(productId)};`,
        );
      }
      const caps = capitalsByProduct.get(productId) ?? [];

      // Find matching capital (same capital_capital value)
      const matching = caps.find((c) => c.capital_capital === product.capital);

      if (matching) {
        // Branch A: update existing capital stock
        capitalId = matching.capital_id;
        const newStock = matching.capital_stock + product.qty;
        queries.push(
          `UPDATE capitals SET capital_stock = ${bind(newStock)}, capital_updated_at = ${bind(now)}, capital_sync_at = null
           WHERE capital_id = ${bind(capitalId)};`,
        );
      } else {
        // Branch B: insert new capital
        capitalId = generateId();
        queries.push(
          `INSERT INTO capitals (capital_id, capital_stock, capital_capital, capital_updated_at, capital_sync_at, product_id)
           VALUES (${bind(capitalId)}, ${bind(product.qty)}, ${bind(product.capital)}, ${bind(now)}, ${bind(null)}, ${bind(productId)});`,
        );
      }
    }

    // INSERT product_event (always)
    const eventId = generateId();
    queries.push(
      `INSERT INTO product_events (product_event_id, timestamp, product_event_note, product_event_sync_at, product_event_value, capital_id)
       VALUES (${bind(eventId)}, ${bind(now)}, ${bind(eventNote)}, ${bind(null)}, ${bind(eventValue)}, ${bind(capitalId)});`,
    );

    // INSERT record_product (always)
    const rpId = product.id;
    queries.push(
      `INSERT INTO record_products (record_product_id, product_event_id, record_id, record_product_name, record_product_price, record_product_qty, record_product_capital, record_product_total)
       VALUES (${bind(rpId)}, ${bind(eventId)}, ${bind(recordId)}, ${bind(product.name)}, ${bind(product.price)}, ${bind(product.qty)}, ${bind(product.capital)}, ${bind(product.total)});`,
    );

    // INSERT discounts (if any)
    for (const discount of product.discounts) {
      queries.push(
        `INSERT INTO discounts (discount_id, record_product_id, discount_kind, discount_value, discount_eff)
         VALUES (${bind(generateId())}, ${bind(rpId)}, ${bind(discount.kind)}, ${bind(discount.value)}, ${bind(discount.eff)});`,
      );
    }
  }

  const queriesStr = queries.join("\n");
  const sql = `BEGIN TRANSACTION;${queriesStr}COMMIT;`;

  return { sql, bindings };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function addNewRecord(tx: NewRecord) {
  const now = Date.now();
  return Effect.gen(function* () {
    yield* preCheckUniqueIds(tx.products, tx.extras);
    // --- check + fetch all in parallel ---
    const [capitalsByProduct] = yield* Effect.all(
      [
        fetchExistingCapitals(tx.products),
        checkBasics(tx.products, tx.extras),
        checkInputCodes(tx.products),
        checkDbCodes(tx.products),
      ],
      { concurrency: "unbounded" },
    );

    // --- Build and execute transaction ---
    const recordId = generateId();
    const { sql, bindings } = buildTransaction(tx, now, recordId, capitalsByProduct);
    yield* DB.execute(sql, bindings).pipe(Effect.asVoid);

    return recordId;
  });
}
