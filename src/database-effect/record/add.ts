import { Effect, pipe } from "effect";
import { Product as ProductTx } from "~/transaction-effect/product/get-by-tab";
import { Extra as ExtraTx } from "~/transaction/extra/get-by-tab";
import { DB } from "../instance";
import Decimal from "decimal.js";
import { calcCombinedCapital } from "./update-mode";

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
  methodId: number;
  fix: number;
  customer: {
    name: string;
    phone: string;
    id?: number;
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
  const timestamp = Date.now();
  return Effect.gen(function* () {
    const bindings: (number | string | null)[] = [];
    let bindingIndex = 1;
    let query = "";
    query += `INSERT INTO records (timestamp, record_paid_at, record_rounding, record_is_credit, record_cashier, record_mode, record_pay, record_note, 
        method_id, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total)
        VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++});\n`;
    bindings.push(
      timestamp,
      timestamp,
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
    );

    if (customer.id === undefined) {
      query += `INSERT INTO customers (customer_name, customer_phone) VALUES ($${bindingIndex++}, $${bindingIndex++});\n`;
      bindings.push(customer.name, customer.phone);
    }

    if (extras.length > 0) {
      query += `INSERT INTO record_extras (record_extra_name, timestamp, record_extra_value, record_extra_eff, record_extra_kind)
         VALUES ${extras.map(() => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`).join(", ")};\n`;
      for (const extra of extras) {
        bindings.push(extra.name, timestamp, extra.base, extra.eff, extra.kind);
      }
    }

    if (products.length > 0) {
      const productFulls = yield* calcEffCapital({
        products,
        subtotal,
        grandTotal,
        fix,
      });
      query += `INSERT INTO record_products (product_id, timestamp, record_product_name, record_product_price,
         record_product_qty, record_product_capital, record_product_capital_raw, record_product_total)
         VALUES ${productFulls
           .map(
             () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
                     $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
           )
           .join(", ")};\n`;

      for (const product of productFulls) {
        bindings.push(
          product.product?.id ?? null,
          timestamp,
          product.name,
          product.price,
          product.qty,
          product.capital,
          product.capitalRaw,
          product.total,
        );
      }

      for (const product of productFulls) {
        if (product.product?.id) {
          if (mode === "buy") {
            query += `UPDATE products SET product_stock = product_stock + $${bindingIndex++}, product_capital = $${bindingIndex++} WHERE product_id = $${bindingIndex++};\n`;
            bindings.push(product.qty, product.capital, product.product.id);
          } else {
            query += `UPDATE products SET product_stock = product_stock - $${bindingIndex++} WHERE product_id = $${bindingIndex++};\n`;
            bindings.push(product.qty, product.product.id);
          }
        }

        const filteredDiscounts = product.discounts.filter((d) => d.eff !== 0);
        if (filteredDiscounts.length > 0) {
          const productIndex = productFulls.indexOf(product);
          query += `INSERT INTO discounts (record_product_id, discount_value, discount_eff, discount_kind) VALUES ${filteredDiscounts
            .map(
              () =>
                `((SELECT record_product_id FROM record_products WHERE timestamp = $1 LIMIT 1 OFFSET ${productIndex}), $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
            )
            .join(", ")};\n`;
          for (const discount of filteredDiscounts) {
            bindings.push(discount.value, discount.eff, discount.kind);
          }
        }
      }
    }
    yield* DB.try((db) => db.execute(query, bindings));
    return timestamp;
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
