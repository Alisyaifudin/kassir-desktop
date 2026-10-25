import { Link } from "react-router";
import { ExternalLink, Package } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useImageUrl } from "~/hooks/use-image";
import { cn } from "~/lib/utils";
import { isPublished, type Product } from "~/services/product";
import { isLoss } from "./use-filtered";
import {
  ListingCodes,
  LossBadge,
  StockBadge,
  UnpublishedBadge,
  formatPrice,
  priceRange,
} from "./z-ProductBits";

export function ProductGrid({ items, urlBack }: { items: Product[]; urlBack: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} urlBack={urlBack} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product, urlBack }: { product: Product; urlBack: string }) {
  const cover = product.cover;
  const url = useImageUrl(cover?.name ?? null, cover?.mime ?? null);
  // Withdrawn from the till: desaturated cover, muted surfaces, and a badge, so
  // the card reads as "parked" at a glance on a grid of otherwise equal cards.
  const published = isPublished(product);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card",
        !published && "border-dashed bg-muted/40",
      )}
    >
      <div
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden bg-muted/40",
          !published && "bg-muted",
        )}
      >
        {url !== null ? (
          <img
            src={url}
            alt={product.name}
            draggable={false}
            className={cn("h-full w-full object-cover", !published && "opacity-40 grayscale")}
          />
        ) : (
          <Package
            className={cn(
              "size-10 text-muted-foreground/40 small:size-8",
              !published && "opacity-50",
            )}
          />
        )}
        {isLoss(product) || !published ? (
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {isLoss(product) ? <LossBadge /> : null}
            {published ? null : <UnpublishedBadge />}
          </div>
        ) : null}
        <Button
          asChild
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 size-12 rounded-full bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background small:size-10"
        >
          <Link
            to={{
              pathname: `/products/${product.id}`,
              search: `url_back=${encodeURIComponent(urlBack)}`,
            }}
            aria-label={`Buka ${product.name}`}
            title="Buka produk"
          >
            <ExternalLink className="icon" />
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-1.5 p-2.5">
        <span
          className={cn(
            "line-clamp-2 text-small font-medium leading-tight",
            !published && "text-muted-foreground",
          )}
        >
          {product.name}
        </span>
        <ListingCodes product={product} />
        <span className="text-normal tabular-nums text-muted-foreground">
          {priceRange(product)}
        </span>
        {/* The highest `capital` among the lots, not the weighted average the
            table's `Modal` column shows: the dearest lot is what decides whether
            a price is worth selling at. */}
        <span
          className={cn(
            "text-small tabular-nums text-muted-foreground",
            !published && "opacity-60",
          )}
          title="Modal tertinggi per pcs dari lot stok"
        >
          Modal {formatPrice(product.maxCapital)}
        </span>
        <div className="flex items-center justify-between gap-1">
          <StockBadge product={product} />
          <span className="text-normal text-muted-foreground">{product.listings.length} data</span>
        </div>
      </div>
    </div>
  );
}
