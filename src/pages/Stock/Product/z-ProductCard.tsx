import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { LazyImage } from "~/components/LazyImage";
import { Product } from "~/database/product/cache";
import { useProductCover } from "~/hooks/use-product-cover";
import { cn, formatBarcode } from "~/lib/utils";

export function ProductCard({ product, urlBack }: { product: Product; urlBack: string }) {
  const cover = useProductCover(product.id);
  const empty = product.stock <= 0;
  // same rule the table marked in red: priced at or below its own capital
  const attention = product.capital >= product.price;
  return (
    <li
      className={cn(
        // not a link: the card is plain content so its text stays selectable, only the
        // corner button below navigates.
        "flex h-full w-full flex-col gap-1 rounded-lg border bg-card p-1.5",
        { "border-destructive/60": attention },
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted/30">
        <LazyImage file={cover?.file ?? null} mime={cover?.mime ?? null} alt={product.name} />
        <Link
          to={{
            pathname: `product/${product.id}`,
            search: `?url_back=${encodeURIComponent(urlBack)}`,
          }}
          aria-label={`Buka detail ${product.name}`}
          title="Buka detail"
          className={cn(
            "absolute top-1 right-1 inline-flex items-center justify-center rounded-full border p-1",
            "bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          )}
        >
          <ExternalLink className="icon" />
        </Link>
      </div>
      <p className="text-small line-clamp-2 leading-tight">{product.name}</p>
      <p className="text-small line-clamp-2 font-mono whitespace-pre-line text-muted-foreground">
        {formatBarcode(product.barcode)}
      </p>
      <dl className="text-small mt-auto flex flex-col">
        <Row label="Harga" value={`Rp${product.price.toLocaleString("id-ID")}`} />
        <Row label="Modal" value={`Rp${product.capital.toLocaleString("id-ID")}`} />
        <Row
          label="Stok"
          value={product.stock.toLocaleString("id-ID")}
          className={empty ? "text-destructive" : undefined}
        />
      </dl>
    </li>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono", className)}>{value}</dd>
    </div>
  );
}
