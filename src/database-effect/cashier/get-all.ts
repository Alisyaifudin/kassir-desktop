import { DB } from "../instance";
import { Effect } from "effect";

export type Cashier = {
  name: string;
  role: DB.Role;
};

export function all() {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.Cashier[]>("SELECT cashier_name, cashier_role FROM cashiers"),
    );
    const data: Cashier[] = res.map((r) => ({ name: r.cashier_name, role: r.cashier_role }));
    return data;
  });
}
