import { LazyImage } from "~/components/LazyImage";
import { Product } from "~/database/product/cache";
import { useProductCover } from "~/hooks/use-product-cover";
import { cn } from "~/lib/utils";

export function ProductCard({
  product,
  sellMode,
  onSelect,
}: {
  product: Product;
  sellMode: boolean;
  onSelect: (product: Product) => void;
}) {
  const cover = useProductCover(product.id);
  const empty = product.stock <= 0;
  const outOfStock = sellMode && empty;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(product)}
        className={cn(
          "flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg border bg-card p-1.5 text-left",
          "transition hover:border-primary/60 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          { "border-destructive/60 hover:border-destructive": outOfStock },
        )}
      >
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-md border bg-muted/30",
            { "bg-destructive/10": outOfStock },
          )}
        >
          <LazyImage
            file={cover?.file ?? null}
            mime={cover?.mime ?? null}
            alt={product.name}
          />
          {outOfStock ? (
            <span className="text-small absolute bottom-1 left-1 rounded bg-destructive px-1 font-medium text-destructive-foreground">
              Habis
            </span>
          ) : null}
        </div>
        <p className="text-small line-clamp-2 leading-tight">{product.name}</p>
        <p className="text-small truncate font-mono text-muted-foreground">
          {product.barcode ?? ""}
        </p>
        <div className="mt-auto flex items-baseline justify-between gap-1">
          <span className="text-small font-mono font-semibold">
            Rp{product.price.toLocaleString("id-ID")}
          </span>
          <span className={cn("text-small", empty ? "text-destructive" : "text-muted-foreground")}>
            {product.stock}
          </span>
        </div>
      </button>
    </li>
  );
}
