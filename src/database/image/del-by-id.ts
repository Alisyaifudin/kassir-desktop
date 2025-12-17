import { DefaultError, err, NotFound, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function delById(id: number): Promise<Result<DefaultError | NotFound, string>> {
  const db = await getDB();
  const [errSelect, res] = await tryResult({
    run: () =>
      db.select<{ name: string }[]>("SELECT img_name AS name FROM images WHERE img_id = $1", [id]),
  });
  if (errSelect !== null) {
    return err(errSelect);
  }
  if (res.length === 0) return err("Tidak ditemukan");
  const [errMsg] = await tryResult({
    run: () => db.execute("DELETE FROM images WHERE img_id = $1", [id]),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(res[0].name);
}
