import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateRole(name: string, role: DB.Role): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE cashiers SET cashier_role = $1 WHERE cashier_name = $2", [role, name]),
  });
  return errMsg;
}
