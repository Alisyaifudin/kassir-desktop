import { DB } from "../instance";
import { Effect } from "effect";

export function upsertProductsSync(
  product: {
    id: string;
    name: string;
    price: number;
    note: string;
    updatedAt: number;
    codes: string[];
    capitals: {
      id: string;
      stock: number;
      capital: number;
      deletedAt?: number;
      events: {
        id: string;
        timestamp: number;
        note: string;
        value: number;
      }[];
    }[];
  },
  now: number,
) {
  let paramIndex = 1;
  const bindings: unknown[] = [];
  const bind = (v: unknown) => {
    bindings.push(v);
    return `$${paramIndex++}`;
  };
  const queries = [
    `INSERT INTO products (product_id, product_name, product_price, 
    product_note, product_updated_at, product_sync_at)
    VALUES (${bind(product.id)}, ${bind(product.name)}, ${bind(product.price)}, 
    ${bind(product.note)}, ${bind(product.updatedAt)}, ${bind(now)}) 
    ON CONFLICT (product_id) DO UPDATE SET
    product_name = excluded.product_name,
    product_price = excluded.product_price,
    product_note = excluded.product_note,
    product_updated_at = excluded.product_updated_at,
    product_sync_at = excluded.product_sync_at`,
  ];
  if (product.codes.length > 0) {
    queries.push(`DELETE FROM product_codes WHERE product_id = ${bind(product.id)}`);
    const placeholderCodes = product.codes
      .map((code) => `(${bind(product.id)}, ${bind(code)})`)
      .join(", ");
    queries.push(`INSERT INTO product_codes (product_id, product_code) VALUES ${placeholderCodes}`);
  }
  for (const capital of product.capitals) {
    if (capital.deletedAt === undefined) {
      queries.push(
        `INSERT INTO capitals (capital_id, capital_stock, capital_capital,
        capital_updated_at, capital_sync_at, capital_deleted_at, product_id)
        VALUES (${bind(capital.id)}, ${bind(capital.stock)}, ${bind(capital.capital)},
        ${bind(now)}, ${bind(now)}, ${bind(null)}, ${bind(product.id)})
        ON CONFLICT (capital_id) DO UPDATE SET
        capital_stock = excluded.capital_stock,
        capital_capital = excluded.capital_capital,
        capital_updated_at = excluded.capital_updated_at,
        capital_sync_at = excluded.capital_sync_at,
        capital_deleted_at = excluded.capital_deleted_at,
        product_id = excluded.product_id`,
      );
      if (capital.events.length > 0) {
        const placeholderEvents = capital.events
          .map(
            (event) =>
              `(${bind(event.id)}, ${bind(event.timestamp)}, ${bind(event.value)},
            ${bind(now)}, ${bind(event.note)}, ${bind(capital.id)})`,
          )
          .join(", ");
        queries.push(
          `INSERT INTO product_events (product_event_id, timestamp, product_event_value,
          product_event_sync_at, product_event_note, capital_id)
          VALUES ${placeholderEvents}
          ON CONFLICT (product_event_id) DO NOTHING`,
        );
      }
    } else {
      queries.push(
        `UPDATE capitals SET capital_deleted_at = ${bind(capital.deletedAt)},
        capital_updated_at = ${bind(capital.deletedAt)}, capital_sync_at = ${bind(now)}
        WHERE capital_id = ${bind(capital.id)}`,
      );
      queries.push(`DELETE FROM product_events WHERE capital_id = ${bind(capital.id)}`);
    }
  }

  return DB.execute(`BEGIN TRANSACTION;${queries.join(";\n")}COMMIT;`, bindings).pipe(
    Effect.as(product.id),
  );
}
