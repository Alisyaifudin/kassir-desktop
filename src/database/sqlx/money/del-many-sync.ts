import { Effect } from "effect";
import { DB } from "../instance";

export function deleteManyMoneySync(money: { id: string; deletedAt: number }[], now: number) {
  if (money.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = money.map(
    () =>
      `UPDATE money SET money_deleted_at = $${bindingIndex++}, 
      money_updated_at = $${bindingIndex++}, money_sync_at = $${bindingIndex++}
      WHERE money_id = $${bindingIndex++};`,
  );
  const bindings = money.flatMap(({ id, deletedAt }) => [deletedAt, deletedAt, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
