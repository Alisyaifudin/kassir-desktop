import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

export function getExtraById(id: string) {
  return DB.select<DBNamespace.Extra[]>(
    "SELECT * FROM extras WHERE extra_id = $1 AND extra_deleted_at IS NULL",
    [id],
  ).pipe(
    Effect.flatMap((r) =>
      r.length === 0 ? NotFound.fail("Biaya lainnya tidak ditemukan") : Effect.succeed(r[0]),
    ),
    Effect.map((r) => ({
      id: r.extra_id,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
      updatedAt: r.extra_updated_at,
      syncAt: r.extra_sync_at ?? undefined,
    })),
  );
}
