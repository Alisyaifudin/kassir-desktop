import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package } from "lucide-react";
import { Loader, type Result } from "~/components/Loader";
import { Loading } from "~/components/Loading";
import { useImageUrl } from "~/hooks/use-image";
import type { Listing, ListingError } from "~/services/listing";
import { cn } from "~/lib/utils";
import { rupiah } from "../util-rupiah";

const ESTIMATE_ROW = 320;
const MIN_CELL = 260;
const MAX_COLUMNS = 5;
const LOW_STOCK = 5;

/**
 * The catalog listings under a search query, replacing the draft lines. A
 * product may have several listings, so these are listings — each with its
 * parent's cover and stock joined in.
 *
 * Rows are virtualized; arrows move a selection across the grid, Enter (or a
 * click) adds the listing to the draft, and Up from the top row returns to the
 * search field.
 */
export function SearchResults({
  res,
  containerRef,
  onPick,
  onExit,
}: {
  res: Result<Listing[], ListingError>;
  containerRef: RefObject<HTMLDivElement | null>;
  onPick: (listing: Listing) => void;
  onExit: () => void;
}) {
  return (
    <Loader res={res} fallback={<Loading />}>
      {({ data }) => (
        <Grid listings={data} containerRef={containerRef} onPick={onPick} onExit={onExit} />
      )}
    </Loader>
  );
}

function Grid({
  listings,
  containerRef,
  onPick,
  onExit,
}: {
  listings: Listing[];
  containerRef: RefObject<HTMLDivElement | null>;
  onPick: (listing: Listing) => void;
  onExit: () => void;
}) {
  const [columns, setColumns] = useState(3);
  const [selected, setSelected] = useState(0);

  // Column count follows the container width; virtualization needs it as a number.
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const update = () =>
      setColumns(Math.max(1, Math.min(MAX_COLUMNS, Math.floor(el.clientWidth / MIN_CELL))));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // A new query starts again from the first result.
  useEffect(() => {
    setSelected(0);
  }, [listings]);

  const virtualizer = useVirtualizer({
    count: Math.ceil(listings.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => ESTIMATE_ROW,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(Math.floor(selected / columns), { align: "auto" });
  }, [selected, columns, virtualizer]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (listings.length === 0) return;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        setSelected((i) => Math.min(i + 1, listings.length - 1));
        return;
      case "ArrowLeft":
        event.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
        return;
      case "ArrowDown":
        event.preventDefault();
        setSelected((i) => Math.min(i + columns, listings.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (selected < columns) onExit();
        else setSelected((i) => Math.max(i - columns, 0));
        return;
      case "Enter":
        event.preventDefault();
        if (listings[selected] !== undefined) onPick(listings[selected]);
        return;
      case "Escape":
        event.preventDefault();
        onExit();
        return;
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="min-h-0 flex-1 overflow-y-auto outline-none"
    >
      {listings.length === 0 ? (
        <p className="p-4 text-muted-foreground select-none">Tidak ada produk.</p>
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
                const listing = listings[index];
                if (listing === undefined) return <div key={column} />;
                return (
                  <Cell
                    key={listing.id}
                    listing={listing}
                    selected={index === selected}
                    onHover={() => setSelected(index)}
                    onClick={() => onPick(listing)}
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

function Cell({
  listing,
  selected,
  onHover,
  onClick,
}: {
  listing: Listing;
  selected: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const url = useImageUrl(listing.cover?.name ?? null, listing.cover?.mime ?? null);
  const stockClass =
    listing.stock <= 0
      ? "text-destructive"
      : listing.stock <= LOW_STOCK
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden border-b border-r text-left transition-colors hover:bg-accent/50",
        selected && "z-10 bg-primary/10 ring-2 ring-primary ring-inset",
      )}
    >
      <span className="flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden bg-muted/40">
        {url !== null ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-8 text-muted-foreground/40" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2 py-2">
        <span className="truncate text-small font-medium leading-tight">{listing.name}</span>
        <span className="truncate font-mono text-small leading-tight text-muted-foreground">
          {listing.code || "tanpa kode"}
        </span>
        <span className="flex items-center justify-between gap-2 text-small leading-tight tabular-nums">
          <span>{rupiah(listing.price)}</span>
          <span className="text-muted-foreground">×{listing.unit}</span>
          <span className={stockClass}>{listing.stock}</span>
        </span>
      </span>
    </button>
  );
}
