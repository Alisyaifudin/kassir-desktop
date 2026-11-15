import { Effect, Layer, type Context } from "effect";
import { image } from "~/lib/image";
import { DatabaseService } from "../db";
import { ImageError, ImageService } from ".";
import REFS_FILE from "./refs.sql?raw";

type Db = Context.Tag.Service<typeof DatabaseService>;

/**
 * The refcount, shared with the optimizer.
 *
 * `refs.sql` is the one definition of "who names this file": this service uses
 * it to decide whether an unlink is allowed, and `src-tauri/src/image_opt.rs`
 * includes the same file when it retires the picture it just replaced. A copy of
 * the count in either place would let the two drift, and the day they disagree
 * is the day a delete takes a file another row still shows.
 */
const REFS = REFS_FILE;

/**
 * The gate itself.
 *
 * `ImageService` is how a *caller* reaches it (a page, a cart) — a caller has a
 * context, not a pool. A domain service is the other shape: it already holds the
 * database, and making it require the tag as well would thread an image
 * dependency through every layer and every test harness that builds one, for a
 * decision that is four lines of SQL. So the body lives here, once, and
 * `ImageLive` is a thin layer that hands it to the tag.
 */
export function releaseWith(db: Db) {
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
    release: (name: string): Effect.Effect<"deleted" | "kept", ImageError> =>
      Effect.gen(function* () {
        if ((yield* refs(name)) > 0) return "kept" as const;
        yield* image
          .del(name)
          .pipe(Effect.mapError((error) => new ImageError({ message: error.e.message })));
        return "deleted" as const;
      }),
  };
}

export const ImageLive = Layer.effect(
  ImageService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return releaseWith(db);
  }),
);
