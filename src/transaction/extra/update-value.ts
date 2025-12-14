import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function value(id: string, v: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute("UPDATE extras SET extra_value = $1 WHERE extra_id = $2", [v, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
