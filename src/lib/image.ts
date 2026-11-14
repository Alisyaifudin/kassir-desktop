import {
  exists,
  mkdir,
  writeFile,
  readFile,
  remove,
  stat,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { Effect } from "effect";
import { ArrayBufferError, IOError, InvokeError } from "./effect-error";
import { log } from "./log";
import type { Mime } from "~/services/product";

/** What a written picture ended up as: the file key the row must carry. */
export type StoredImage = { name: string; mime: Mime };

/**
 * Writes a picked file, then hands it to the optimizer.
 *
 * The bytes go through the fs plugin (raw, one call) and the *conversion* goes
 * through Rust (`image_adopt` in `src-tauri/src/image_opt.rs`): WebP encoding needs
 * libwebp, which the webview does not have — `canvas.toBlob("image/webp")` silently
 * answers PNG under WebKitGTK, so a webview-side encoder is not one this app can
 * test or trust.
 *
 * The name that comes back is **not** `fileKey`: the picture is stored under a hash
 * of the bytes that were actually written, so two identical pictures land on one
 * file and a row can always be checked against its own content. Every caller must
 * commit the returned name and mime, not the ones it passed in — a row pointing at
 * `fileKey` after the adopt would name a file that is no longer there.
 */
function save(file: File, fileKey: string, mimeType: Mime) {
  return Effect.gen(function* () {
    const checkExist = yield* Effect.tryPromise({
      try: () =>
        exists("images", {
          baseDir: BaseDirectory.AppData,
        }),
      catch: (error) => new IOError(error, "Gagal membaca folder images"),
    });
    if (!checkExist) {
      yield* Effect.tryPromise({
        try: () =>
          mkdir("images", {
            baseDir: BaseDirectory.AppData,
            recursive: true,
          }),
        catch: (error) => new IOError(error, "Gagal membuat folder images"),
      });
    }
    const arrayBuffer = yield* Effect.tryPromise({
      try: () => file.arrayBuffer(),
      catch: (e) => new ArrayBufferError(e),
    });
    const data = new Uint8Array(arrayBuffer);
    yield* Effect.tryPromise({
      try: () =>
        writeFile(`images/${fileKey}`, data, {
          baseDir: BaseDirectory.AppData,
        }),
      catch: (e) => new IOError(e, "Gagal menyimpan file"),
    });

    // The draft name is the pick's; the stored name is the content's. Rust unlinks
    // the draft once the stored file is safely on disk.
    const stored = yield* Effect.tryPromise({
      try: () => invoke<StoredImage>("image_adopt", { name: fileKey, mime: mimeType }),
      catch: (e) => {
        log.error(e instanceof Error ? e : new Error(String(e)));
        return new InvokeError({
          message: typeof e === "string" ? e : "Gagal mengoptimalkan gambar",
        });
      },
    });
    return stored;
  });
}

/**
 * `fileKey` is the image's `image_name` as stored in the DB, which is what
 * `save` writes to. It is NOT the row id (`image_id`) - readers and deleters must
 * pass `image_name`, otherwise they look for a file that was never written.
 */
function load(fileKey: string, mimeType: Mime) {
  return Effect.gen(function* () {
    const pathname = yield* Effect.tryPromise({
      try: () => path.join("images", fileKey),
      catch: (e) => new IOError(e, "Gagal menggabungkan path images dengan nama file"),
    });
    const image = yield* Effect.tryPromise({
      try: () =>
        readFile(pathname, {
          baseDir: BaseDirectory.AppData,
        }),
      catch: (e) => new IOError(e, "Gagal membaca gambar"),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = new Blob([image as any], { type: mimeType });
    const objectURL = URL.createObjectURL(blob);
    return objectURL;
  });
}

function del(fileKey: string) {
  return Effect.gen(function* () {
    const pathname = yield* Effect.tryPromise({
      try: () => path.join("images", fileKey),
      catch: (e) => new IOError(e, "Gagal menggabungkan path images dengan nama file"),
    });
    yield* Effect.tryPromise({
      try: () =>
        remove(pathname, {
          baseDir: BaseDirectory.AppData,
        }),
      catch: (e) => new IOError(e, "Gagal membaca gambar"),
    });
  });
}

/**
 * The size of an image file on disk, in bytes.
 *
 * `fileKey` is the row's `image_name`, like every other reader here. The one
 * caller (`services/sync/blob.ts`) totals it to say how many bytes an upload
 * pass will move — the sync service otherwise only ever learns a file's size
 * from the server, after the fact.
 *
 * Fails like `load` does when the file is not there. That is not an error at the
 * call site: a pulled row names bytes that may only ever have lived on the
 * device that produced them, and the upload answers `local_missing` for exactly
 * that case.
 */
function size(fileKey: string) {
  return Effect.gen(function* () {
    const pathname = yield* Effect.tryPromise({
      try: () => path.join("images", fileKey),
      catch: (e) => new IOError(e, "Gagal menggabungkan path images dengan nama file"),
    });
    return yield* Effect.tryPromise({
      try: async () => (await stat(pathname, { baseDir: BaseDirectory.AppData })).size,
      catch: (e) => new IOError(e, "Gagal membaca ukuran gambar"),
    });
  });
}

export const image = {
  save,
  load,
  del,
  size,
} as const;
