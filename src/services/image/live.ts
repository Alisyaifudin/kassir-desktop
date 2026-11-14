import { Effect, Layer } from "effect";
import { image } from "~/lib/image";
import { DatabaseService } from "../db";
import { ImageError, ImageService } from ".";

/**
 * How many live rows name one file.
 *
 * A soft-deleted row does **not** own its file: `images` keeps the tombstone so
 * the delete can sync, and a tombstone that owned the bytes would mean a
 * catalogue never frees a byte (rows are soft-deleted forever). That is also
 * what the app does today, where deleting a picture unlinks it straight away;
 * the difference is that it can no longer unlink a file another product, record
 * or combo still shows.
 *
 * `record_images` has no tombstone — it is an immutable child of a record, so a
 * row is either there or the record is gone with `ON DELETE CASCADE`.
 */
const REFS = `SELECT (
    (SELECT COUNT(*) FROM images
      WHERE image_name = $1 AND image_deleted_at IS NULL) +
    (SELECT COUNT(*) FROM record_images
      WHERE record_image_name = $1) +
    (SELECT COUNT(*) FROM tx_images
      WHERE tx_image_name = $1) +
    (SELECT COUNT(*) FROM combos
      WHERE combo_cover_name = $1 AND combo_deleted_at IS NULL)
  ) AS refs`;

export const ImageLive = Layer.effect(
  ImageService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    function refs(name: string): Effect.Effect<number, ImageError> {
      return db.selectOne<{ refs: number }>(REFS, [name]).pipe(
        // `selectOne` answers `NotFound` on an empty result; this query always
        // returns its one row, so that branch is only here to satisfy the type.
        Effect.map((row) => row.refs),
        Effect.mapError((error) => new ImageError({ message: error.message })),
      );
    }

    return {
      refs,
      release: (name) =>
        Effect.gen(function* () {
          if ((yield* refs(name)) > 0) return "kept" as const;
          yield* image
            .del(name)
            .pipe(Effect.mapError((error) => new ImageError({ message: error.e.message })));
          return "deleted" as const;
        }),
    };
  }),
);
