import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { cache } from "./cache";

export function add(name: string, kind: Exclude<DB.MethodEnum, "cash">) {
  const id = generateId();
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO methods (method_id, method_name, method_kind, method_deleted_at, 
       method_updated_at, method_sync_at) VALUES ($1, $2, $3, null, $4, null)`,
      [id, name, kind, now],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, {
        id,
        name,
        kind,
        deletedAt: null,
        updatedAt: now,
        syncAt: null,
      });
    }),
    Effect.asVoid,
  );
}
