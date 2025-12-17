import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add(name: string, mime: DB.Mime, id: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("INSERT INTO images (img_name, img_mime, product_id) VALUES ($1, $2, $3)", [
        name,
        mime,
        id,
      ]),
  });
  return errMsg;
}
