import { AlertTriangle, EyeOff } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Product } from "~/services/product";
import { maxPrice, minPrice, stockStatus, type StockStatus } from "./use-filtered";

export function formatPrice(value: number): string {
  return value.toLocaleString("id-ID");
}

export function priceRange(product: Product): string {
  if (product.listings.length === 0) return "-";
  const min = minPrice(product);
  const max = maxPrice(product);
  return min === max ? `Rp${formatPrice(min)}` : `Rp${formatPrice(min)} – ${formatPrice(max)}`;
}

const STOCK_STYLE: Record<StockStatus, string> = {
  in: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  low: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  out: "bg-destructive/15 text-destructive",
};

export function StockBadge({ product }: { product: Product }) {
  const status = stockStatus(product);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium tabular-nums",
        STOCK_STYLE[status],
      )}
    >
      {product.stock}
    </span>
  );
}

export function LossBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-sm font-medium text-destructive">
      <AlertTriangle className="size-4" /> Rugi
    </span>
  );
}

/**
 * The withdrawn-from-the-till marker. Grey on purpose, and the only badge in
 * this file that is: loss is red and stock is green/amber/destructive, so a
 * neutral chip says "this row is parked", not "this row is a problem".
 *
 * The row or card it sits on is muted to match — see `ProductTable` and
 * `ProductCard` — so the clue reads even before the label does.
 */
export function UnpublishedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-sm font-medium text-muted-foreground ring-1 ring-inset ring-foreground/10">
      <EyeOff className="size-4" /> Tidak terbit
    </span>
  );
}

/**
 * Barcodes / QR payloads of the product's coded listings. Codes live on
 * listings (one each), so a product has 0..N; nothing renders when it has none.
 *
 * `max-w-[18ch]` is load-bearing: a table cell has no definite width, so without
 * a cap `whitespace-nowrap` would let a long QR payload stretch the Nama column
 * and squeeze the numeric columns. The cap gives `truncate` something to clip
 * against; `title` keeps the full value reachable.
 */
export function ListingCodes({ product, max = 2 }: { product: Product; max?: number }) {
  const codes = [
    ...new Set(
      product.listings
        .map((listing) => listing.code)
        .filter((code): code is string => code !== null && code !== ""),
    ),
  ];
  if (codes.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {codes.slice(0, max).map((code) => (
        <span
          key={code}
          title={code}
          className="max-w-[18ch] truncate font-mono text-sm leading-tight text-muted-foreground"
        >
          {code}
        </span>
      ))}
      {codes.length > max ? (
        <span title={codes.slice(max).join(", ")} className="text-sm text-muted-foreground">
          +{codes.length - max}
        </span>
      ) : null}
    </div>
  );
}
