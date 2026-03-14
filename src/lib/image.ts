import { exists, mkdir, writeFile, readFile, remove, BaseDirectory } from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { Effect } from "effect";

class IOError {
  readonly _tag = "IOError";
  error: Error;
  constructor(v: unknown, msg: string) {
    this.error = new Error(msg, { cause: v });
  }
}

class ArrayBufferError {
  readonly _tag = "ArrayBufferError";
  error: Error;
  constructor(v: unknown) {
    this.error = new Error("Gagal mengkonversi file ke arraybuffer", { cause: v });
  }
}

type MimeType = "image/png" | "image/jpeg";

function save(file: File, name: string) {
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
        writeFile(`images/${name}`, data, {
          baseDir: BaseDirectory.AppData,
        }),
      catch: (e) => new IOError(e, "Gagal menyimpan file"),
    });
  });
}

function load(name: string, mimeType: MimeType) {
  return Effect.gen(function* () {
    const pathname = yield* Effect.tryPromise({
      try: () => path.join("images", name),
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

function del(name: string) {
  return Effect.gen(function* () {
    const pathname = yield* Effect.tryPromise({
      try: () => path.join("images", name),
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
