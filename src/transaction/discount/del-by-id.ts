import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function delById(id: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: async () => tx.execute(`DELETE FROM discounts WHERE disc_id = $1`, [id]),
  });
  return errMsg;
}
