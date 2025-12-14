import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function name(id: string, v: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute("UPDATE extras SET extra_name = $1 WHERE extra_id = $2", [v, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
