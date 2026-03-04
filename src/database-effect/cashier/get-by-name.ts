import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

type Cashier = {
  name: string;
  role: DB.Role;
  hash: string;
};
export function byName(name: string) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.Cashier[]>("SELECT * FROM cashiers WHERE cashier_name = $1", [name]),
    );
    if (res.length === 0) return yield* NotFound.fail("Kasir tidak ditemukan");
    const data: Cashier = {
      name: res[0].cashier_name,
      role: res[0].cashier_role,
      hash: res[0].cashier_hash,
    };
    return data;
  });
}

// export function updateName(name: { old: string; new: string }) {
//   return DB.try((db) =>
//     db.execute("UPDATE cashiers SET cashier_name = $1 WHERE cashier_name = $2", [
//       name.new,
//       name.old,
//     ]),
//   ).pipe(Effect.flatMap(() => Effect.void));
// }
