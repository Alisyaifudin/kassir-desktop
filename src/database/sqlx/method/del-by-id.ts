import { Effect } from "effect";
import { DB } from "../instance";

export function deleteMethodById(id: string, now: number) {
  return DB.execute(
    `UPDATE methods SET method_deleted_at = $1, method_updated_at = $2 
     WHERE method_id = $3 AND method_name IS NOT NULL`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
