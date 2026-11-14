import { Context, Data, Effect } from "effect";

export class ImageError extends Data.TaggedError("ImageError")<{ message: string }> {}

/**
 * What `release` did with a file: unlinked it, or left it alone because another
 * row still names it.
 */
export type Release = "deleted" | "kept";

/**
 * The ownership of the files under `AppData/images/`.
 *
 * A file has no owner row. Four tables name one — the product gallery
 * (`images.image_name`), the pictures attached to a sale
 * (`record_images.record_image_name`), the ones attached to an open cart
 * (`tx_images.tx_image_name`) and a combo's cover (`combos.combo_cover_name`) —
 * and the same name may appear in more than one of them: a picture copied from a
 * cart into a record keeps its name, and once the optimizer dedupes, several
 * rows of the *same* table share one too.
 *
 * So "delete the picture" is never an unlink. It is a count, and only a count of
 * zero is a permission. `release` is that gate, and it is the only sanctioned way
 * to remove a stored image: the two remaining `image.del` calls in the app are
 * rollbacks of a file whose row was never written (`use-gallery.ts`,
 * `ComboForm.tsx`), so nothing can name it.
 */
export class ImageService extends Context.Tag("ImageService")<
  ImageService,
  {
    /** How many live rows name this file. */
    refs: (name: string) => Effect.Effect<number, ImageError>;
    /** Unlinks `name` only when nothing names it any more. */
    release: (name: string) => Effect.Effect<Release, ImageError>;
  }
>() {}
