import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useState } from "react";
import { Effect } from "effect";

export function ProductDownload() {
  const { loading, error, handleSubmit } = useProduct();
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center justify-between p-2 ">
      <input type="hidden" name="action" value="product"></input>
      <h3 className="italic text-normal font-bold">Produk</h3>
      <Button>
        Unduh
        <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </form>
  );
}

//========================================================
//========================================================
//========================================================

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
  const json = JSON.stringify(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    products.map(({ updatedAt, syncAt, ...p }) => p),
    null,
    2,
  );
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