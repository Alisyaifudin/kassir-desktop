import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package } from "lucide-react";
import { useImageUrl } from "~/hooks/use-image";
import type { StockHit } from "~/lib/search/stocks";
import type { ProductFull, Stock } from "~/services/product";
import { cn } from "~/lib/utils";

const ESTIMATE_ROW = 360;
/** Fixed four-up grid; the dialog spans the screen, so it does not need breakpoints. */
const COLUMNS = 4;

export type StockRow = { stock: Stock; product: ProductFull };

/**
 * The lot results under the query. One cell per *lot*: the product is context,
 * and the code/price come from the listing that matched best (falling back to
 * the product's cheapest listing). Rows are virtualized because a short query
 * can still match hundreds of lots.
 */
export function StockGrid({
  hits,
  rows,
  selectedId,
  onPick,
}: {
  hits: StockHit[];
  rows: Map<string, StockRow>;
  selectedId: string | null;
  onPick: (stockId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const columns = COLUMNS;

  const virtualizer = useVirtualizer({
    count: Math.ceil(hits.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => ESTIMATE_ROW,
    overscan: 4,
  });

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
      {hits.length === 0 ? (
        <p className="p-4 text-small text-muted-foreground">Tidak ada lot.</p>
      ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: columns }).map((_, column) => {
                const index = row.index * columns + column;
                const hit = hits[index];
                if (hit === undefined) return <div key={column} />;
                const entry = rows.get(hit.id);
                if (entry === undefined) return <div key={column} />;
                return (
                  <Card
                    key={hit.id}
                    hit={hit}
                    entry={entry}
                    selected={hit.id === selectedId}
                    onPick={onPick}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  hit,
  entry,
  selected,
  onPick,
}: {
  hit: StockHit;
  entry: StockRow;
  selected: boolean;
  onPick: (stockId: string) => void;
}) {
  const { stock, product } = entry;
  const matched = product.listings.find((listing) => listing.id === hit.listingId);
  const listing =
    matched ??
    product.listings.reduce<(typeof product.listings)[number] | undefined>(
      (cheapest, candidate) =>
        cheapest === undefined || candidate.price < cheapest.price ? candidate : cheapest,
      undefined,
    );
  const url = useImageUrl(product.cover?.name ?? null, product.cover?.mime ?? null);

  return (
    <button
      type="button"
      onClick={() => onPick(stock.id)}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden border-b border-r text-left transition-colors hover:bg-accent/50",
        selected && "bg-primary/10 ring-2 ring-primary ring-inset",
      )}
    >
      <span className="flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden bg-muted/40">
        {url !== null ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-8 text-muted-foreground/40" />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 px-2 py-2">
        <span className="truncate text-small font-medium leading-tight">{product.name}</span>
        <span className="truncate font-mono text-small leading-tight text-muted-foreground">
          {listing?.code || "tanpa kode"}
        </span>
        <span className="flex items-center justify-between gap-2 text-small leading-tight tabular-nums">
          <span>{listing === undefined ? "-" : `Rp${listing.price.toLocaleString("id-ID")}`}</span>
          <span className="text-muted-foreground">×{listing?.unit ?? 1}</span>
        </span>
        <span className="flex items-center justify-between gap-2 text-small leading-tight tabular-nums">
          <span>{stock.value} pcs</span>
          <span className="text-muted-foreground">
            Rp{stock.capital.toLocaleString("id-ID")}
          </span>
        </span>
      </span>
    </button>
  );
}
