import { Effect, Layer } from "effect";
import { image } from "~/lib/image";
import { DatabaseService } from "../db";
import { ImageError, ImageService } from ".";
import REFS_FILE from "./refs.sql?raw";

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
