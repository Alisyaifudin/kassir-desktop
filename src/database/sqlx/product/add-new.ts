import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";

type Input = {
  name: string;
  price: number;
  note: string;
  codes: string[];
  stock: number;
  capital: number;
};

export function addNewProduct({ name, price, note, capital, codes, stock }: Input, now: number) {
  const productId = generateId();
  const capitalId = generateId();
  const eventId = generateId();

  let paramIndex = 1;
  const bindings: unknown[] = [];
  const bind = (...vs: unknown[]) => {
    bindings.push(...vs);
    const placeholders = vs.map(() => `$${paramIndex++}`).join(", ");
    return `(${placeholders})`;
  };

  let query = [
    `INSERT INTO products (product_id, product_name, product_price, product_note, product_updated_at) VALUES ${bind(productId, name, price, note, now)};`,
    `INSERT INTO capitals (capital_id, capital_stock, capital_capital, capital_updated_at, product_id) VALUES ${bind(capitalId, stock, capital, now, productId)};`,
    `INSERT INTO product_events (product_event_id, timestamp, product_event_type, product_event_value, capital_id) VALUES ${bind(eventId, now, "manual", stock, capitalId)};`,
  ].join("\n");

  if (codes.length > 0) {
    const codePlaceholders = codes.map(() => `($${paramIndex++}, $${paramIndex++})`).join(", ");
    query += `INSERT INTO product_codes (product_code, product_id) VALUES ${codePlaceholders};`;
    codes.forEach((code) => bindings.push(code, productId));
  }
  return DB.execute(`BEGIN TRANSACTION;${query}COMMIT;`, bindings).pipe(
    Effect.as({
      productId,
      capitalId,
      eventId,
    }),
  );
}
