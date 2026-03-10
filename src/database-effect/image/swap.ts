import { Effect } from "effect";
import { DB } from "../instance";

export function swap(a: number, b: number) {
  return DB.try((db) =>
    db.execute(
      `UPDATE images SET img_id = -1 WHERE img_id = $1;
         UPDATE images SET img_id = $1 WHERE img_id = $2;
         UPDATE images SET img_id = $2 WHERE img_id = -1;`,
      [a, b],
    ),
  ).pipe(Effect.asVoid);
}
