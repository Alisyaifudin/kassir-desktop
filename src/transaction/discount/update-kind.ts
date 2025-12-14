import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function kind(id: string, kind: TX.DiscKind): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: async () =>
      tx.execute(`UPDATE discounts SET disc_kind = $1 WHERE disc_id = $2`, [kind, id]),
  });
  return errMsg;
}
