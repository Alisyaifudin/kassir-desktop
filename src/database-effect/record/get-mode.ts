import { DefaultError, err, NotFound, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function getMode(
  timestamp: number
): Promise<Result<DefaultError | NotFound, DB.Mode>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult<{ record_mode: DB.Mode }[]>({
    run: () => db.select(`SELECT record_mode FROM records WHERE timestamp = $1`, [timestamp]),
  });
  if (errMsg !== null) return err(errMsg);
  if (res.length === 0) return err("Tidak ditemukan");
  const mode = res[0].record_mode;
  return ok(mode);
}
