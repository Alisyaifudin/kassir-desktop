import { AlertTriangle } from "lucide-react";
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
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

const STOCK_STYLE: Record<StockStatus, string> = {
  in: "bg-emerald-500/15 text-emerald-700",
  low: "bg-amber-500/15 text-amber-700",
  out: "bg-destructive/15 text-destructive",
};

export function StockBadge({ product }: { product: Product }) {
  const status = stockStatus(product);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        STOCK_STYLE[status],
      )}
    >
      {product.stock}
    </span>
  );
}

export function LossBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
      <AlertTriangle className="size-3" /> Rugi
    </span>
  );
}

export function KindChips({ product, max = 3 }: { product: Product; max?: number }) {
  const kinds = [...new Set(product.listings.map((listing) => listing.kind))];
  if (kinds.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {kinds.slice(0, max).map((kind) => (
        <span key={kind} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {kind}
        </span>
      ))}
      {kinds.length > max ? (
        <span className="text-xs text-muted-foreground">+{kinds.length - max}</span>
      ) : null}
    </div>
  );
}
