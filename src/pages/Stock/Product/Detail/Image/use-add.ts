import { Effect } from "effect";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "~/database";
import { image } from "~/lib/image-effect";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

export function useAdd(id: number, onClose: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<null | string>(null);
  function reset() {
    setFile(null);
    setSrc(null);
    if (src) URL.revokeObjectURL(src);
  }
  async function handleAdd() {
    if (file === null) return;
    setLoading(true);
    const errMsg = await Effect.runPromise(program(id, file));
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      reset();
      onClose();
      revalidate();
    }
  }
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files === null || files.length === 0) {
      reset();
      return;
    }
    const file = files[0];
    setFile(file);
    setSrc(URL.createObjectURL(file));
  };
  return { src, handleAdd, handleInput, loading, error, reset };
}

function program(id: number, file: File) {
  return Effect.gen(function* () {
    if (file.size > 10 * 1e6) {
      return "Ukuran maksimum 10 MB";
    }
    const now = Temporal.Now.instant().epochMilliseconds;
    const rawName = file.name.replace(/\s+/g, "-");
    const name = `${now}-${rawName}`;
    const parsedMime = z.enum(["image/jpeg", "image/png"]).safeParse(file.type);
    if (!parsedMime.success) {
      return "Format gambar tidak didukung";
    }
    const mimeType = parsedMime.data;
    yield* image.save(file, name);
    yield* db.image.add(name, mimeType, id);
    return null;
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "DbError":
          log.error(e.e);
          return Effect.succeed(e.e.message);
        case "IOError":
        case "ArrayBufferError":
          log.error(e.error);
          return Effect.succeed(e.error.message);
      }
    }),
  );
}
