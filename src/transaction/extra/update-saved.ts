import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function saved(id: string, v: boolean): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute("UPDATE extras SET extra_saved = $1 WHERE extra_id = $2", [v ? 1 : 0, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
