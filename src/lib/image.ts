import { exists, mkdir, writeFile, readFile, remove, BaseDirectory } from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { Effect } from "effect";
import { ArrayBufferError, IOError } from "./effect-error";
import type { Mime } from "~/services/product";

function save(file: File, fileKey: string) {
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

export const image = {
  save,
  load,
  del,
} as const;
