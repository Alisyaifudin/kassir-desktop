import { Effect } from "effect";
import { TX } from "../instance";

export function reorder(ids: string[]) {
  if (ids.length === 0) return Effect.void;
  const now = Date.now();
  const queries: string[] = [];
  const bindings: (string | number)[] = [];
  for (let i = 0; i < ids.length; i++) {
    const createdAt = now + i;
    queries.push(
      `UPDATE products SET product_created_at = $${1 + 2 * i} 
      WHERE product_id = $${2 + 2 * i}`,
    );
    bindings.push(createdAt, ids[i]);
  }
  const query = `BEGIN TRANSACTION;\n${queries.join(";\n")};\nCOMMIT;`;
  return TX.try((tx) => tx.execute(query, bindings)).pipe(Effect.asVoid);
}
