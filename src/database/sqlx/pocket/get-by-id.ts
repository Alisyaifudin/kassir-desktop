import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";

export function getPocketById(id: string) {
  return DB.select<DB.Pocket[]>(
    "SELECT * FROM pockets WHERE pocket_deleted_at IS NULL AND pocket_id = $1 ORDER BY pocket_ordering",
    [id],
  ).pipe(
    Effect.flatMap((r) =>
      r.length === 0
        ? NotFound.fail("Kantong tidak ditemukan")
        : Effect.succeed({
            id: r[0].pocket_id,
            name: r[0].pocket_name,
            type: r[0].pocket_type,
            ordering: r[0].pocket_ordering,
            updatedAt: r[0].pocket_updated_at,
          }),
    ),
  );
}
