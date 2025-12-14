import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add({
  name,
  role,
  hash,
}: {
  name: string;
  role: DB.Role;
  hash: string;
}): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        "INSERT INTO cashiers (cashier_name, cashier_role, cashier_hash) VALUES ($1, $2, $3)",
        [name, role, hash],
      ),
  });
  return errMsg;
}
