import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { css } from "~/pages/Shop/style.css";
import { Extra } from "~/database/extra/caches";
import { Product } from "~/database/product/caches";
import { useStoreValue } from "@simplestack/store/react";
import { basicStore } from "../../use-transaction";
import { useSize } from "~/hooks/use-size";

export function Output({
  products,
  extras,
  handleClickExtra,
  handleClickProduct,
}: {
  products: Product[];
  extras: Extra[];
  handleClickProduct: (product: Product) => void;
  handleClickExtra: (extra: Extra) => void;
}) {
  const size = useSize();
  const mode = useStoreValue(basicStore.select("mode"));
  return (
    <div
      className={cn(
        "bg-white absolute left-1 w-full h-fit border shadow-md right-1 z-20 overflow-x-clip overflow-y-auto",
        css.output[size],
        {
          hidden: products.length === 0 && extras.length === 0,
        },
      )}
    >
      <ol className="flex flex-col gap-1 w-full">
        <Show when={products.length > 0}>
          <p className="text-bold italic text-small">----Produk</p>
        </Show>
        {products.slice(0, 20).map((product, i) => (
          <li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
            <button
              type="button"
              onClick={() =>
                handleClickProduct({
                  id: product.id,
                  stock: product.stock,
                  name: product.name,
                  price: product.price,
                  barcode: product.barcode ?? "",
                })
              }
              className={cn(
                "cursor-pointer text-small w-full grid hover:bg-sky-100/50",
                "flex items-center justify-between",
                { "bg-red-400 hover:bg-red-300": product.stock === 0 && mode === "sell" },
              )}
            >
              <span className={cn("text-start text-wrap")}>{product.name}</span>
              {product.barcode !== null ? (
                <span className="text-start">{product.barcode}</span>
              ) : null}
            </button>
          </li>
        ))}
        <Show when={extras.length > 0}>
          <p className="text-bold text-small italic">----Biaya Lainnya</p>
        </Show>
        {extras.map((extra, i) => (
          <li key={i} className={i % 2 === 0 ? "bg-muted" : ""}>
            <button
              type="button"
              onClick={() =>
                handleClickExtra({
                  name: extra.name,
                  value: extra.value,
                  kind: extra.kind,
                  id: extra.id,
                })
              }
              className={cn("cursor-pointer text-small w-full grid hover:bg-sky-100/50")}
            >
              <span className={cn("text-start text-wrap")}>{extra.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
