import { tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function swap(a: number, b: number): Promise<"Aplikasi bermasalah" | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        `UPDATE images SET img_id = -1 WHERE img_id = $1;
         UPDATE images SET img_id = $1 WHERE img_id = $2;
         UPDATE images SET img_id = $2 WHERE img_id = -1;`,
        [a, b]
      ),
  });
  return errMsg;
}
