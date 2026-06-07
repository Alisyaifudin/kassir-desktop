import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";
import { Effect } from "effect";

export function getUnsyncImagesAfter(timestamp: number) {
  const images = cache.getAll();
  if (images.length > 0) {
    return Effect.succeed(
      images.map((image) => image.syncAt === undefined && image.updatedAt > timestamp),
    );
  }
  return sqlx.image.get.unsync.after(timestamp);
}
