import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function kind(id: string, v: TX.ValueKind): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute("UPDATE extras SET extra_kind = $1 WHERE extra_id = $2", [v, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
