import { SchemaDialog } from "./z-Schema";
import { UploadInput } from "~/components/UploadInput";
import { Product } from "~/services/product/type";
import { Effect } from "effect";
import { ProductAlreadyExistError, ProductError, UniqueCodeError } from "~/services/product/error";
import { ProductService } from "~/services/product";
import { extractProduct } from "./util-validate-product";
import { DuplicateError } from "~/lib/error-effect";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useUploadProgress } from "~/components/UploadProgress";

export const productUpload = Effect.gen(function* () {
  const productService = yield* ProductService;
  const add = (product: Product) => productService.add.external(product);
  return function ProductUpload() {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-normal font-bold mb-2">Produk</h3>
          <SchemaDialog />
        </div>
        <UploadInput extract={extractProduct}>
          {(products) => <UploadedEntries products={products} add={add} />}
        </UploadInput>
      </div>
    );
  };
});

type ProductError_ = ProductError | UniqueCodeError | ProductAlreadyExistError;

function UploadedEntries({
  products,
  add,
}: {
  products: Product[];
  add: (product: Product) => Promise<ProductError_ | null>;
}) {
  const progress = useUploadProgress({
    items: products,
    getId: (p) => p.id,
    add,
  });

  if (products.length === 0) return null;

  const firstPendingIndex = progress.findIndex((p) => p.state === "pending");

  return (
    <ol className="mt-4 space-y-2">
      {progress.map((item, i) => {
        if (item.state === "pending" && i !== firstPendingIndex) return null;
        return (
          <li key={item.item.id} className="flex flex-col gap-1 text-small">
            <div className="flex items-center gap-2">
              <span>{i + 1}.</span>
              {item.state === "success" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : item.state === "error" ? (
                <XCircle className="w-4 h-4 text-destructive shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <span>
                {item.item.id} - {item.item.name}
              </span>
            </div>
            {item.state === "error" && <ErrorComp error={item.error} />}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorComp({
  error,
}: {
  error: ProductError | UniqueCodeError | ProductAlreadyExistError | DuplicateError;
}) {
  switch (error._tag) {
    case "DuplicateError":
      return <span className="text-destructive truncate">{error.e.message}</span>;
    case "ProductAlreadyExistError":
      return (
        <span className="text-amber-600 truncate">
          Sudah ada — <span className="font-medium">{error.existing.name}</span>{" "}
          <span className="text-muted-foreground">({error.existing.id})</span> sudah terdaftar
        </span>
      );
    case "UniqueCodeError":
      return (
        <span className="text-destructive truncate">
          Kode <span className="font-medium">{error.inserted.code}</span> sudah digunakan oleh{" "}
          <span className="font-medium">{error.existing.name}</span>{" "}
          <span className="text-muted-foreground">({error.existing.code})</span>
        </span>
      );
    case "ProductError":
      return <span className="text-destructive truncate">{error.e.message}</span>;
  }
}
