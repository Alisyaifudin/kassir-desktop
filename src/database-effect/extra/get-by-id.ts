import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

export function getById(id: number) {
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

// export function getById(id: number) {
//   const cache = getCache();
//   if (cache !== null) {
//     const find = cache.find((c) => c.id === id);
//     if (find === undefined) return err("Tidak ditemukan");
//     return ok(find);
//   }
//   const [errMsg, res] = await tryResult({
//     run: () => db.select<DB.Extra[]>("SELECT * FROM extras WHERE extra_id = $1", [id]),
//   });
//   if (errMsg !== null) return err(errMsg);
//   if (res.length === 0) return err("Tidak ditemukan");
//   const r = res[0];
//   return ok({
//     id: r.extra_id,
//     kind: r.extra_kind,
//     name: r.extra_name,
//     value: r.extra_value,
//   });
// }
