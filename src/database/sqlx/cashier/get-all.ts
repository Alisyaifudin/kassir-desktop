import { DB } from "../instance";
import { Effect } from "effect";

export type CashierWithoutHash = {
  name: string;
  role: DB.Role;
  id: string;
};

export function getAllCashier() {
  return Effect.gen(function* () {
    const res = yield* DB.select<DB.Cashier[]>("SELECT cashier_name, cashier_role, cashier_id FROM cashiers")
    const data: CashierWithoutHash[] = res.map((r) => ({
      name: r.cashier_name,
      role: r.cashier_role,
      id: r.cashier_id,
    }));
    return data;
  });
}
