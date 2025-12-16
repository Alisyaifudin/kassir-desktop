import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateName(name: { old: string; new: string }): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE cashiers SET cashier_name = $1 WHERE cashier_name = $2", [
        name.new,
        name.old,
      ]),
  });
  return errMsg;
}
