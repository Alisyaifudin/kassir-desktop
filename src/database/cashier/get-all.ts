import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Cashier = {
  name: string;
  role: DB.Role;
};

export async function all(): Promise<Result<DefaultError, Cashier[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Cashier[]>("SELECT cashier_name, cashier_role FROM cashiers"),
  });
  if (errMsg) return err(errMsg);
  return ok(res.map((r) => ({ name: r.cashier_name, role: r.cashier_role })));
}
