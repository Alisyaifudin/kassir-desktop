import { DefaultError, err, NotFound, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

type Cashier = {
  name: string;
  role: DB.Role;
  hash: string;
};

export async function byName(name: string): Promise<Result<DefaultError | NotFound, Cashier>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Cashier[]>("SELECT * FROM cashiers WHERE cashier_name = $1", [name]),
  });
  if (errMsg) return err(errMsg);
  if (res.length === 0) return err("Tidak ditemukan");
  return ok({
    name: res[0].cashier_name,
    role: res[0].cashier_role,
    hash: res[0].cashier_hash,
  });
}
