import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { Extra } from "~/database/extra/cache";
import { Product } from "~/database/product/cache";
import { FuzzyResult } from "@nozbe/microfuzz";
import { useMode } from "../../use-transaction";
import { GRID_COLUMN_CLASS, useGridColumns } from "~/hooks/use-grid-columns";
import { ProductCard } from "./z-ProductCard";

const MAX_PRODUCTS = 20;

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
  const mode = useMode();
  const columns = useGridColumns();
  function selectProduct(product: Product) {
    handleClickProduct({ ...product, barcode: product.barcode ?? "" });
  }
  return (
    <output
      className={cn(
        "bg-white absolute left-1 h-fit border shadow-md right-1 z-20 overflow-x-clip overflow-y-auto rounded-lg",
        "scroll-gutter overscroll-contain",
        "max-h-[calc(100dvh-200px)] small:max-h-[calc(100dvh-177px)] top-[150px] small:top-[125px]",
        {
          hidden: products.length === 0 && extras.length === 0,
        },
      )}
    >
      <div className="flex flex-col gap-1 w-full">
        <Show when={extras.length > 0}>
          <p className="text-small font-bold italic">----Biaya Lainnya</p>
        </Show>
        <ul className="flex flex-col gap-1 w-full">
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
        </ul>
        <Show when={products.length > 0}>
          <p className="text-small font-bold italic">----Produk</p>
        </Show>
        <ul className={cn("grid gap-1.5 p-1", GRID_COLUMN_CLASS[columns])}>
          {products.slice(0, MAX_PRODUCTS).map((product) => (
            <ProductCard
              key={product.item.id}
              product={product.item}
              sellMode={mode === "sell"}
              onSelect={selectProduct}
            />
          ))}
        </ul>
        <Show when={products.length > MAX_PRODUCTS}>
          <p className="text-small px-2 pb-1 text-muted-foreground">
            Menampilkan {MAX_PRODUCTS} dari {products.length} produk
          </p>
        </Show>
      </div>
    </output>
  );
}
