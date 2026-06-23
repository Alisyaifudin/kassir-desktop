import { DB } from "../instance";
import { Effect } from "effect";
import { getCapitalId } from "./get-capital-id";

export function updateEventCapital(
  id: string,
  capital: {
    id: string;
    stock: number;
    capital: number;
  },
) {
  return Effect.gen(function* () {
    // Get current event's capital_id and value
    const rows = yield* getCapitalId(id);
    const event = rows[0];
    if (!event) return capital.id;

    // Early return if already pointing to the same capital
    if (event.capitalId === capital.id) return capital.id;

    const now = Date.now();
    const queries: string[] = [];
    const bindings: unknown[] = [];
    let paramIndex = 1;
    const bind = (v: unknown) => {
      bindings.push(v);
      return `$${paramIndex++}`;
    };

    // Reverse stock on previous capital
    queries.push(
      `UPDATE capitals SET capital_stock = capital_stock - ${bind(event.value)},
       capital_updated_at = ${bind(now)}, capital_sync_at = null
       WHERE capital_id = ${bind(event.capitalId)}`,
    );

    // Apply stock to new capital
    queries.push(
      `UPDATE capitals SET capital_stock = capital_stock + ${bind(event.value)},
       capital_updated_at = ${bind(now)}, capital_sync_at = null
       WHERE capital_id = ${bind(capital.id)}`,
    );

    // Update the product_event to point to the new capital
    queries.push(
      `UPDATE product_events SET capital_id = ${bind(capital.id)} WHERE product_event_id = ${bind(id)}`,
    );

    yield* DB.execute(`BEGIN TRANSACTION;${queries.join(";\n")}COMMIT;`, bindings);

    return capital.id;
  });
}
