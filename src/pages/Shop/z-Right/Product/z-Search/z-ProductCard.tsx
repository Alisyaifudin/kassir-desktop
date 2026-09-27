import { cn } from "~/lib/utils";
import { Product } from "~/database/product/cache";

/**
 * A single row in the product search dropdown.
 *
 * Rendered as a <button> so the whole row is clickable and focusable.
 * `onMouseDown` is prevented so the search input keeps focus — the dropdown
 * stays open and arrow-key navigation keeps working after a click.
 */
export function ProductCard({
  product,
  index,
  active = false,
  onSelect,
}: {
  product: Product;
  index: number;
  active?: boolean;
  onSelect: (product: Product) => void;
}) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;
  const barcode = product.barcode?.trim();

  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        onClick={() => onSelect(product)}
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
          active
            ? "bg-active text-active-foreground shadow-md"
            : "hover:bg-accent focus-visible:bg-accent",
          outOfStock && !active && "opacity-55",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-tiny font-semibold tabular-nums transition-colors",
            active
              ? "bg-active-foreground/20 text-active-foreground"
              : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground",
          )}
        >
          {index + 1}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span
            title={product.name}
            className={cn(
              "truncate text-small leading-tight",
              active ? "font-semibold text-active-foreground" : "font-medium text-foreground",
            )}
          >
            {product.name}
          </span>
          {barcode ? (
            <span
              className={cn(
                "truncate font-mono text-tiny leading-tight",
                active ? "text-active-foreground/75" : "text-muted-foreground",
              )}
            >
              {barcode}
            </span>
          ) : null}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={cn(
              "text-small font-bold tabular-nums",
              active ? "text-active-foreground" : "text-foreground",
            )}
          >
            Rp{product.price.toLocaleString("id-ID")}
          </span>
          <Stock stock={product.stock} low={lowStock} empty={outOfStock} active={active} />
        </span>
      </button>
    </li>
  );
}

function Stock({
  stock,
  low,
  empty,
  active,
}: {
  stock: number;
  low: boolean;
  empty: boolean;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-tiny font-medium leading-tight tabular-nums",
        active
          ? "bg-active-foreground/20 text-active-foreground"
          : cn(
              empty && "bg-destructive/10 text-destructive",
              low && "bg-amber-500/10 text-amber-600",
              !empty && !low && "bg-muted text-muted-foreground",
            ),
      )}
    >
      {empty ? "Habis" : low ? `Sisa ${stock}` : `Stok ${stock}`}
    </span>
  );
}
