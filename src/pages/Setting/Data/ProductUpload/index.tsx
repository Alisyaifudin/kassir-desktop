import { useCallback, useEffect, useRef, useState } from "react";
import { SchemaDialog } from "./z-Schema";
import { UploadInput } from "~/components/UploadInput";
import { Product } from "~/services/product/type";
import { Effect } from "effect";
import { ProductAlreadyExistError, ProductError, UniqueCodeError } from "~/services/product/error";
import { ProductService } from "~/services/product";
import { extractProduct } from "./util-validate-product";
import { DuplicateError } from "~/lib/error-effect";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export const productUpload = Effect.gen(function* () {
  const productService = yield* ProductService;
  return function PorductUpload() {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2">
          <h3 className="text-normal font-bold mb-2">Produk</h3>
          <SchemaDialog />
        </div>
        <UploadInput extract={extractProduct}>
          {(products) => <UploadedEntries products={products} add={productService.add.external} />}
        </UploadInput>
      </div>
    );
  };
});

function UploadedEntries({
  products,
  add,
}: {
  products: Product[];
  add: (
    product: Product,
  ) => Effect.Effect<void, ProductError | UniqueCodeError | ProductAlreadyExistError>;
}) {
  const startedRef = useRef(false);
  const [progress, setProgress] = useState<
    (
      | {
          state: "pending";
          id: string;
          name: string;
        }
      | {
          state: "error";
          id: string;
          name: string;
          error: ProductError | UniqueCodeError | ProductAlreadyExistError | DuplicateError;
        }
      | {
          state: "success";
          id: string;
          name: string;
        }
    )[]
  >(() => products.map((p) => ({ state: "pending", id: p.id, name: p.name })));

  const init = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const insertedSet = new Set<string>();
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (insertedSet.has(product.id)) {
        setProgress((prev) => {
          const next = [...prev];
          next[i] = {
            state: "error",
            id: product.id,
            name: product.name,
            error: DuplicateError.new(
              `Duplikat. Produk dengan id: ${product.id} sudah dimasukkan.`,
            ),
          };
          return next;
        });
        continue;
      }
      const error = await Effect.runPromise(
        add(product).pipe(
          Effect.as(null),
          Effect.catchAll((e) => Effect.succeed(e)),
        ),
      );
      setProgress((prev) => {
        const next = [...prev];
        if (error) {
          next[i] = { state: "error", id: product.id, name: product.name, error };
        } else {
          insertedSet.add(product.id);
          next[i] = { state: "success", id: product.id, name: product.name };
        }
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  if (products.length === 0) return null;

  const firstPendingIndex = progress.findIndex((p) => p.state === "pending");

  return (
    <ol className="mt-4 space-y-2">
      {progress.map((item, i) => {
        if (item.state === "pending" && i !== firstPendingIndex) return null;
        return (
          <li key={item.id} className="flex flex-col gap-1 text-small">
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
              {item.id} - {item.name}
            </span>
          </div>
          {item.state === "error" && <ErrorComp name={item.name} error={item.error} id={item.id} />}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorComp({
  error,
}: {
  id: string;
  name: string;
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
