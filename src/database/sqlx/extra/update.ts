import { DB } from "../instance";
import { Effect } from "effect";

export function updateExtra(
  id: string,
  name: string,
  value: number,
  kind: DBNamespace.ValueKind,
  now: number,
) {
  return DB.execute(
    `UPDATE extras SET extra_name = $1, extra_kind = $2, extra_value = $3,
     extra_updated_at = $4, extra_sync_at = null WHERE extra_id = $5`,
    [name, kind, value, now, id],
  ).pipe(Effect.asVoid);
}
