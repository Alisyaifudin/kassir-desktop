import { DB } from "../instance";
import { Effect } from "effect";

export function upsertManyMoney({
  money,
  now,
}: {
  money: {
    id: string;
    note: string;
    value: number;
    timestamp: number;
    pocketId: string;
    updatedAt: number;
  }[];
  now: number;
}) {
  let bindingIndex = 1;
  const placeholders = money
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
          $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
          $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = money.flatMap(({ id, value, note, pocketId, timestamp, updatedAt }) => [
    id,
    timestamp,
    value,
    pocketId,
    note,
    updatedAt,
    now,
  ]);
  return DB.execute(
    `INSERT INTO money (money_id, timestamp, money_value, pocket_id, 
    money_note, money_updated_at, money_sync_at)
    VALUES ${placeholders} ON CONFLICT (money_id) DO UPDATE SET 
    timestamp = excluded.timestamp,
    money_value = excluded.money_value,
    pocket_id = excluded.pocket_id,
    money_note = excluded.money_note,
    money_updated_at = excluded.money_updated_at,
    money_sync_at = excluded.money_sync_at`,
    bindings,
  ).pipe(Effect.as(money.map((extra) => extra.id)));
}
