import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Effect } from "effect";
import { useState } from "react";
import { db } from "~/database";
import { IOError } from "~/lib/effect-error";
import { log } from "~/lib/log";

export function useProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const errMsg = await Effect.runPromise(program);
    setLoading(false);
    setError(errMsg);
  }
  return { handleSubmit, loading, error };
}

const program = Effect.gen(function* () {
  const products = yield* db.product.get.all();
  const json = JSON.stringify(products, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const data = yield* Effect.tryPromise({
    try: () => blob.bytes(),
    catch: (e) => new IOError(e),
  });
  const name = `${Date.now()}-products.json`;
  const filePath = yield* Effect.tryPromise({
    try: () =>
      save({
        title: "Simpan Data",
        defaultPath: name,
        filters: [{ name: "JSON", extensions: ["json"] }],
      }),
    catch: (e) => new IOError(e),
  });
  if (filePath === null) return null;
  yield* Effect.tryPromise({
    try: () => writeFile(filePath, data),
    catch: (e) => new IOError(e),
  });
  return null;
}).pipe(
  Effect.catchTag("DbError", ({ e }) => {
    log.error(e);
    return Effect.succeed(e.message);
  }),
);
