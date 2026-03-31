import { Effect, pipe } from "effect";
import { Product as ProductTx } from "~/transaction/product/get-by-tab";
import { Extra as ExtraTx } from "~/transaction/extra/get-by-tab";
import { DB } from "../instance";
import Decimal from "decimal.js";
import { calcCombinedCapital } from "./update-mode";
import { generateId } from "~/lib/random";
import { ManyDuplicateError } from "~/lib/effect-error";
import { cache } from "../product/cache";

type Product = Omit<ProductTx, "discounts"> & {
  discounts: Discount[];
  total: number;
  error?: string;
};

type Discount = {
  value: number;
  eff: number;
  subtotal: number;
  kind: TX.DiscKind;
  id: string;
};

type Extra = ExtraTx & {
  eff: number;
  base: number;
  subtotal: number;
};

type Input = {
  isCredit: boolean;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  rounding: number;
  note: string;
  methodId: string;
  fix: number;
  customer: {
    name: string;
    phone: string;
    id?: string;
  };
  subtotal: number;
  total: number;
  grandTotal: number;
  products: Product[];
  extras: Extra[];
};

export function add({
  cashier,
  customer,
  fix,
  isCredit,
  methodId,
  mode,
  rounding,
  note,
  pay,
  subtotal,
  total,
  grandTotal,
  products,
  extras,
}: Input) {
  const recordId = generateId();
  const now = Date.now();
  return Effect.gen(function* () {
    const bindings: (number | string | null)[] = [];
    yield* checkNewProducts(products);
    let bindingIndex = 1;
    let query = "";
    query += `INSERT INTO records (record_id, record_paid_at, record_rounding, record_is_credit, 
    record_cashier, record_mode, record_pay, record_note, method_id, record_fix, record_customer_name, 
    record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at)
    VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
    $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
    $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
    $${bindingIndex++}, $${bindingIndex++});\n`;
    bindings.push(
      recordId,
      now,
      rounding,
      isCredit ? 1 : 0,
      cashier,
      mode,
      pay,
      note,
      methodId,
      fix,
      customer.name,
      customer.phone,
      subtotal,
      total,
      now,
      null,
    );

    if (customer.id === undefined && customer.name !== "") {
      const customerId = generateId();
      query += `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, 
      customer_sync_at) 
      VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
      $${bindingIndex++});\n`;
      bindings.push(customerId, customer.name, customer.phone, now, null);
    }

    if (extras.length > 0) {
      const extraPlaceholders = extras
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      query += `INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, 
      record_extra_value, record_extra_eff, record_extra_kind)
      VALUES ${extraPlaceholders};\n`;
      for (const extra of extras) {
        const id = generateId();
        bindings.push(id, extra.name, recordId, extra.value, extra.eff, extra.kind);
      }
    }

    if (products.length > 0) {
      const productFulls = yield* calcEffCapital({
        products,
        subtotal,
        grandTotal,
        fix,
      });

      const recordProducts: {
        id: string;
        productId: string;
        isNew: boolean;
      }[] = [];
      for (const product of productFulls) {
        const recordProductId = generateId();
        let productId: string;
        if (product.product?.id !== undefined) {
          productId = product.product.id;
          const eventId = generateId();
          if (mode === "buy") {
            query += `UPDATE products SET product_stock = product_stock + $${bindingIndex++}, 
            product_capital = $${bindingIndex++}, product_name = $${bindingIndex++},
            product_updated_at = $${bindingIndex++}, product_sync_at = null 
            WHERE product_id = $${bindingIndex++};\n
            INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
            VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
            $${bindingIndex++}, $${bindingIndex++});\n`;
            bindings.push(
              product.qty,
              product.capital,
              product.name,
              now,
              productId,
              eventId,
              now,
              null,
              "inc",
              product.qty,
              productId,
            );
          } else {
            query += `UPDATE products SET product_stock = product_stock - $${bindingIndex++}, 
            product_price = $${bindingIndex++}, 
            product_name = $${bindingIndex++}, product_updated_at = $${bindingIndex++}, 
            product_sync_at = null 
            WHERE product_id = $${bindingIndex++};\n
            INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
            VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
            $${bindingIndex++}, $${bindingIndex++});\n`;
            bindings.push(
              product.qty,
              product.price,
              product.name,
              now,
              productId,
              eventId,
              now,
              null,
              "dec",
              product.qty,
              productId,
            );
          }
          recordProducts.push({
            id: recordProductId,
            productId,
            isNew: false,
          });
        } else {
          productId = generateId();
          recordProducts.push({
            id: recordProductId,
            productId,
            isNew: true,
          });
        }
      }

      const newProductsPlaceholders = recordProducts
        .filter((r) => r.isNew)
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
          $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      const newEventsPlaceholders = recordProducts
        .filter((r) => r.isNew)
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
          $${bindingIndex++})`,
        )
        .join(", ");
      if (newProductsPlaceholders.length > 0) {
        query += `INSERT INTO products (product_id, product_barcode, product_name, product_price,
        product_stock, product_capital, product_note, product_updated_at, product_sync_at) VALUES 
        ${newProductsPlaceholders};\n`;
        for (let i = 0; i < products.length; i++) {
          if (!recordProducts[i].isNew) continue;
          const product = productFulls[i];
          const qty = mode === "buy" ? product.qty : 0;
          bindings.push(
            recordProducts[i].productId,
            product.barcode,
            product.name,
            product.price,
            qty,
            product.capital,
            "",
            now,
            null,
          );
        }
        query += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
        VALUES ${newEventsPlaceholders};\n`;
        for (let i = 0; i < products.length; i++) {
          if (!recordProducts[i].isNew) continue;
          const product = productFulls[i];
          const eventId = generateId();
          const qty = mode === "buy" ? product.qty : 0;
          bindings.push(eventId, now, null, "manual", qty, recordProducts[i].productId);
        }
      }
      // insert record product
      const recordProductPlaceholders = productFulls
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      query += `INSERT INTO record_products (record_product_id, product_id, record_id, record_product_name, 
      record_product_price, record_product_qty, record_product_capital, record_product_capital_raw, 
      record_product_total) VALUES ${recordProductPlaceholders};\n`;
      for (let i = 0; i < products.length; i++) {
        const product = productFulls[i];
        bindings.push(
          recordProducts[i].id,
          recordProducts[i].productId,
          recordId,
          product.name,
          product.price,
          product.qty,
          product.capital,
          product.capitalRaw,
          product.total,
        );
      }
      for (let i = 0; i < products.length; i++) {
        const product = productFulls[i];
        const filteredDiscounts = product.discounts.filter((d) => d.eff !== 0);
        if (filteredDiscounts.length > 0) {
          const placeholders = filteredDiscounts
            .map(
              () =>
                `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
            )
            .join(", ");
          query += `INSERT INTO discounts (discount_id, record_product_id, discount_value, 
          discount_eff, discount_kind) VALUES ${placeholders};\n`;
          for (const discount of filteredDiscounts) {
            const discountId = generateId();
            bindings.push(
              discountId,
              recordProducts[i].id,
              discount.value,
              discount.eff,
              discount.kind,
            );
          }
        }
      }
    }
    const wrappedQuery = `BEGIN;\n${query}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedQuery, bindings));
    cache.revalidate();
    return recordId;
  });
}

type ProductFull = Product & {
  capitalRaw: number;
  capital: number;
};

function calcCapitalRaw({
  product,
  subtotal,
  grandTotal,
  fix,
}: {
  product: Product;
  subtotal: number;
  grandTotal: number;
  fix: number;
}): number {
  const eff =
    subtotal > 0 ? new Decimal(product.total).div(subtotal).times(grandTotal) : new Decimal(0);
  const capital = product.qty > 0 ? eff.div(product.qty) : 0;
  return Number(capital.toFixed(fix));
}

function calcEffCapital({
  products,
  subtotal,
  grandTotal,
  fix,
}: {
  products: Product[];
  subtotal: number;
  grandTotal: number;
  fix: number;
}) {
  return Effect.gen(function* () {
    const res = yield* Effect.all(
      products.map((p) =>
        pipe(
          p.product === undefined
            ? Effect.succeed(null)
            : DB.try((db) =>
                db.select<
                  { product_stock: number; product_capital: number; product_price: number }[]
                >(
                  `SELECT product_stock, product_capital, product_price FROM products WHERE product_id = $1`,
                  [p.product!.id],
                ),
              ).pipe(
                Effect.map((r) => {
                  if (r.length === 0) {
                    return null;
                  }
                  return {
                    stock: r[0].product_stock,
                    capital: r[0].product_capital,
                    price: r[0].product_price,
                  };
                }),
              ),
          Effect.map((r) => {
            const capitalRaw = calcCapitalRaw({ product: p, subtotal, grandTotal, fix });
            const prevCapital = r?.capital ?? 0;
            const stock = r?.stock ?? 0;
            const capital = calcCombinedCapital(prevCapital, stock, capitalRaw, p.qty);
            const prodEff: ProductFull = {
              ...p,
              capitalRaw,
              capital,
            };
            return prodEff;
          }),
        ),
      ),
    );
    return res;
  });
}

function checkNewProducts(products: Product[]) {
  const filtered = products.filter((p) => p.product === undefined && p.barcode.trim() !== "");
  return Effect.gen(function* () {
    const res = yield* Effect.all(
      filtered.map((p) =>
        DB.try((db) =>
          db.select<{ product_name: string }[]>(
            "SELECT product_name FROM products WHERE product_barcode = $1",
            [p.barcode],
          ),
        ).pipe(
          Effect.map((r) => {
            if (r.length === 0) return null;
            return { new: p.name, current: r[0].product_name };
          }),
        ),
      ),
      { concurrency: 10 },
    );
    const duplicates = res.filter((r) => r !== null);
    if (duplicates.length > 0) return yield* Effect.fail(new ManyDuplicateError(duplicates));
  });
}
