import { Effect } from "effect";
import { TX } from "../instance";

/**
 * Persist the display order of a tab's extras.
 *
 * The transaction `extras` table still uses `extra_order` (an INTEGER PRIMARY
 * KEY / rowid) as its ordering column. Instead of rewriting it to `0..n` —
 * which would collide across tabs because the key is global — each row is
 * appended after the current maximum, in the requested order. New rows then
 * naturally keep increasing the key, preserving the order on reload.
 */
export function reorder(ids: string[]) {
  if (ids.length === 0) return Effect.void;
  const queries: string[] = [];
  const bindings: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    queries.push(
      `UPDATE extras
         SET extra_order = (SELECT COALESCE(MAX(extra_order), 0) FROM extras) + 1
         WHERE extra_id = $${i + 1}`,
    );
    bindings.push(ids[i]);
  }
  const query = `BEGIN TRANSACTION;\n${queries.join(";\n")};\nCOMMIT;`;
  return TX.try((tx) => tx.execute(query, bindings)).pipe(Effect.asVoid);
}
