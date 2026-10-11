import { Link } from "react-router";
import { Package } from "lucide-react";
import { useImageUrl } from "~/hooks/use-image";
import type { Product } from "~/services/product";
import { isLoss } from "./use-filtered";
import {  ListingCodes, LossBadge, StockBadge, priceRange } from "./z-ProductBits";

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

  return (
    <Link
      to={{
        pathname: `/products/${product.id}`,
        search: `url_back=${encodeURIComponent(urlBack)}`,
      }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:shadow-md"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted/40">
        {url !== null ? (
          <img src={url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="size-10 text-muted-foreground/40 small:size-8" />
        )}
        {isLoss(product) ? (
          <div className="absolute left-2 top-2">
            <LossBadge />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 p-2.5">
        <span className="line-clamp-2 text-small font-medium leading-tight">{product.name}</span>
        <ListingCodes product={product} />
        <span className="text-normal tabular-nums text-muted-foreground">
          {priceRange(product)}
        </span>
        <div className="flex items-center justify-between gap-1">
          <StockBadge product={product} />
          <span className="text-normal text-muted-foreground">
            {product.listings.length} data
          </span>
        </div>
      </div>
    </Link>
  );
}
