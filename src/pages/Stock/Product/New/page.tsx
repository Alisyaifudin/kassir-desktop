import { Effect } from "effect";
import { ProductInput, ProductService } from "~/services/product";
import { promisify } from "~/lib/promisify";
import { NewProductForm } from "./z-NewProductForm";

const page = Effect.gen(function* () {
  const productService = yield* ProductService;

  const onSubmit = (product: ProductInput) =>
    promisify(
      () => productService.add.new(product),
      (e) => e.e.message,
    );

  return function Page() {
    return (
      <main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
        <h1 className="font-bold text-big">Tambah barang baru</h1>
        <NewProductForm onSubmit={onSubmit} />
      </main>
    );
  };
});

export default page;
