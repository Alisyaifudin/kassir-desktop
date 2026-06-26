import { DB } from "../instance";
import { Effect } from "effect";

export function updateSyncOneExtra(
  {
    id,
    name,
    value,
    kind,
    updatedAt,
  }: {
    id: string;
    name: string;
    value: number;
    kind: DBNamespace.ValueKind;
    updatedAt: number;
  },
  now: number,
) {
  return DB.execute(
    `UPDATE extras SET extra_name = $1, extra_value = $2, 
    extra_kind = $3, extra_updated_at = $4, extra_sync_at = $5 
    WHERE extra_id = $6`,
    [name, value, kind, updatedAt, now, id],
  ).pipe(Effect.asVoid);
}
