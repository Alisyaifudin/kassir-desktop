import { DB } from "../instance";
import { Effect } from "effect";

export function updateMethod(
  {
    id,
    name,
    label,
  }: {
    id: string;
    name: string;
    label: string;
  },
  now: number,
) {
  return DB.execute(
    `UPDATE methods SET method_name = $1, method_label = $2, method_updated_at = $3,
    method_sync_at = null WHERE method_id = $4`,
    [name, label, now, id],
  ).pipe(Effect.asVoid);
}
