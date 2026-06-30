import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useState } from "react";
import { Effect } from "effect";
import { ProductService } from "~/services/product";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";

export const productDownload = Effect.gen(function* () {
  const productService = yield* ProductService;
  const ioService = yield* IoService;
  const blobService = yield* BlobService;
  const save = program.pipe(
    Effect.provideService(ProductService, productService),
    Effect.provideService(IoService, ioService),
    Effect.provideService(BlobService, blobService),
  );
  return function ProductDownload() {
    const { loading, error, handleSubmit } = useProduct(save);
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
  };
});

//========================================================
//========================================================
//========================================================

export function useProduct(save: Effect.Effect<string | null>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const errMsg = await Effect.runPromise(save);
    setLoading(false);
    setError(errMsg);
  }
  return { handleSubmit, loading, error };
}

const program = Effect.gen(function* () {
  const productService = yield* ProductService;
  const ioService = yield* IoService;
  const blobService = yield* BlobService;
  const products = yield* productService.get.all();
  const data = yield* blobService.convert.fromObject(products);
  const name = `${Date.now()}-products.json`;
  const filePath = yield* ioService.dialog({
    title: "Simpan Data Produk",
    defaultPath: name,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  yield* ioService.save(filePath, data);
  return null;
}).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message)));
