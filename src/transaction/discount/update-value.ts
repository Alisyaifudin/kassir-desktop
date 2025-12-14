import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function value(id: string, value: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: async () =>
      tx.execute(`UPDATE discounts SET disc_value = $1 WHERE disc_id = $2`, [value, id]),
  });
  return errMsg;
}
