import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addManyMoneyExternal(
  pocketId: string,
  money: {
    value: number;
    note: string;
    timestamp: number;
  }[],
) {
  const now = Date.now();
  let bindingIndex = 1;
  const placeholders = money
    .map(
      () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
             $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
    )
    .join(", ");
  const ids = money.map(() => generateId());
  const bindings = money.flatMap(({ note, timestamp, value }, i) => [
    ids[i],
    timestamp,
    value,
    pocketId,
    note,
    now,
  ]);
  return DB.execute(
    `INSERT INTO money (money_id, timestamp, money_value, pocket_id, money_note, 
    money_updated_at) VALUES ${placeholders} ON CONFLICT (money_id) DO NOTHING`,
    bindings,
  ).pipe(Effect.as(ids));
}
