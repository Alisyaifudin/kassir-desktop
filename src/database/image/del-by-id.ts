import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";

export function delById(id: number) {
  return Effect.gen(function* () {
    const images = yield* DB.try((db) =>
      db.select<{ name: string }[]>("SELECT img_name AS name FROM images WHERE img_id = $1", [id]),
    );
    if (images.length === 0) return yield* NotFound.fail("Gambar tidak ditemukan");
    yield* DB.try((db) => db.execute("DELETE FROM images WHERE img_id = $1", [id]));
    return images[0].name;
  });
}
