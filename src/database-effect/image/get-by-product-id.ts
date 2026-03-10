import { DB } from "../instance";
import { Effect } from "effect";

export type Image = {
  id: number;
  name: string;
  mime: DB.Image["img_mime"];
};

export function getByProductId(productId: number) {
  return DB.try((db) =>
    db.select<DB.Image[]>("SELECT * FROM images WHERE product_id = $1", [productId]),
  ).pipe(
    Effect.map(
      (res) =>
        res.map((r) => ({
          id: r.img_id,
          name: r.img_name,
          mime: r.img_mime,
        })) satisfies Image[],
    ),
  );
}
