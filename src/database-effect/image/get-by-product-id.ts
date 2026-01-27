import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Image = {
  id: number;
  name: string;
  mime: DB.Image["img_mime"];
};

export async function getByProductId(productId: number): Promise<Result<DefaultError, Image[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Image[]>("SELECT * FROM images WHERE product_id = $1", [productId]),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      id: r.img_id,
      name: r.img_name,
      mime: r.img_mime,
    }))
  );
}
