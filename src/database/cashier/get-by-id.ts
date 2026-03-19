import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

type Cashier = {
  name: string;
  role: DB.Role;
  hash: string;
  id: string;
};
export function byId(id: string) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.Cashier[]>("SELECT * FROM cashiers WHERE cashier_id = $1", [id]),
    );
    if (res.length === 0) return yield* NotFound.fail("Kasir tidak ditemukan");
    const data: Cashier = {
      id: res[0].cashier_id,
      name: res[0].cashier_name,
      role: res[0].cashier_role,
      hash: res[0].cashier_hash,
    };
    return data;
  });
}