import { DB } from "../instance";
import { Effect } from "effect";

export function add(name: string, mime: DB.Mime, id: number) {
  return DB.try((db) =>
    db.execute("INSERT INTO images (img_name, img_mime, product_id) VALUES ($1, $2, $3)", [
      name,
      mime,
      id,
    ]),
  ).pipe(Effect.asVoid);
}
