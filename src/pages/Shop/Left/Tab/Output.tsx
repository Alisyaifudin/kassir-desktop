import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { css } from "~/pages/Shop/style.css";
import { Extra } from "~/database/extra/caches";
import { Product } from "~/database/product/caches";
import { basicStore } from "../../use-transaction";
import { useSize } from "~/hooks/use-size";
import { useAtom } from "@xstate/store/react";
import { FuzzyResult } from "@nozbe/microfuzz";

export function Output({
  products,
  extras,
  handleClickExtra,
  handleClickProduct,
}: {
  products: FuzzyResult<Product>[];
  extras: FuzzyResult<Extra>[];
  handleClickProduct: (product: Product) => void;
  handleClickExtra: (extra: Extra) => void;
}) {
  const size = useSize();
  const mode = useAtom(basicStore, (state) => state.mode);
  return (
    <output
      className={cn(
        "bg-white absolute left-1 h-fit border shadow-md right-1 z-20 overflow-x-clip overflow-y-auto",
        css.output[size],
        {
          hidden: products.length === 0 && extras.length === 0,
        },
      )}
    >
      <ol className="flex flex-col gap-1 w-full">
        <Show when={extras.length > 0}>
          <p className="text-bold text-small italic">----Biaya Lainnya</p>
        </Show>
        {extras.map((extra, i) => (
          <li key={i} className={i % 2 === 0 ? "bg-blue-50" : ""}>
            <button
              type="button"
              onClick={() =>
                handleClickExtra({
                  name: extra.item.name,
                  value: extra.item.value,
                  kind: extra.item.kind,
                  id: extra.item.id,
                })
              }
              className={cn("cursor-pointer text-small w-full grid hover:bg-sky-100/50")}
            >
              <span className={cn("text-start text-wrap")}>{extra.item.name}</span>
            </button>
          </li>
        ))}
        <Show when={products.length > 0}>
          <p className="text-bold italic text-small">----Produk</p>
        </Show>
        {products.slice(0, 20).map((product, i) => {
          return (
            <li key={i} className={i % 2 === 0 ? "bg-blue-50/50" : ""}>
              <button
                type="button"
                onClick={() =>
                  handleClickProduct({
                    id: product.item.id,
                    stock: product.item.stock,
                    name: product.item.name,
                    price: product.item.price,
                    barcode: product.item.barcode ?? "",
                    capital: product.item.capital,
                  })
                }
                className={cn(
                  "cursor-pointer text-small w-full grid hover:bg-sky-100/50",
                  "flex items-center justify-between",
                  { "bg-red-400 hover:bg-red-300": product.item.stock === 0 && mode === "sell" },
                )}
              >
                <span className={cn("text-start text-wrap")}>{product.item.name}</span>
                {product.item.barcode !== null ? (
                  <span className="text-start">{product.item.barcode}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </output>
  );
}
