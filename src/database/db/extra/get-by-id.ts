import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";
import { cache } from "./cache";

export function getById(id: string) {
  if (cache.size > 0) {
    const extra = cache.get(id);
    if (extra === undefined) return NotFound.fail("Biaya lainnya tidak ditemukan");
    return Effect.succeed(extra);
  }
  return DB.try((db) =>
    db.select<DB.Extra[]>("SELECT * FROM extras WHERE extra_id = $1", [id]),
  ).pipe(
    Effect.flatMap((r) =>
      r.length === 0 ? NotFound.fail("Biaya lainnya tidak ditemukan") : Effect.succeed(r[0]),
    ),
    Effect.map((r) => ({
      id: r.extra_id,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
    })),
  );
}
