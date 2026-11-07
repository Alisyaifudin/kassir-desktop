import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, PackageOpen } from "lucide-react";
import { Loader, type Result } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { createPortal } from "react-dom";
import { useImageUrl } from "~/hooks/use-image";
import type { Combo, ComboError } from "~/services/combo";
import type { ExtraError } from "~/services/extra";
import type { Listing, ListingError } from "~/services/listing";
import { cn } from "~/lib/utils";
import { rupiah } from "~/components/cart/util-rupiah";

const ESTIMATE_ROW = 320;
const MIN_CELL = 2-0;
const MAX_COLUMNS = 5;
const LOW_STOCK = 5;

export type SearchHit =
  | { kind: "listing"; listing: Listing }
  | { kind: "combo"; combo: Combo; components: Listing[]; extraNames: string[] };

export type SearchError = ListingError | ComboError | ExtraError;

/** Search results keep listings and combo templates visibly distinct. */
export function SearchResults({
  res,
  containerRef,
  onPick,
  onExit,
}: {
  res: Result<SearchHit[], SearchError>;
  containerRef: RefObject<HTMLDivElement | null>;
  onPick: (hit: SearchHit) => void;
  onExit: () => void;
}) {
  return (
    <Loader res={res} fallback={<SearchResultsLoading />}>
      {({ data }) => <Grid hits={data} containerRef={containerRef} onPick={onPick} onExit={onExit} />}
    </Loader>
  );
}

/** The catalog's result grid while the search resolves. */
function SearchResultsLoading() {
  return (
    <div
      className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Memuat hasil pencarian"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border p-2">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function Grid({
  hits,
  containerRef,
  onPick,
  onExit,
}: {
  hits: SearchHit[];
  containerRef: RefObject<HTMLDivElement | null>;
  onPick: (hit: SearchHit) => void;
  onExit: () => void;
}) {
  const [columns, setColumns] = useState(4);
  const [selected, setSelected] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const [focused, setFocused] = useState(false);

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
    setKeyboard(false);
  }, [hits]);

  const virtualizer = useVirtualizer({
    count: Math.ceil(hits.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => ESTIMATE_ROW,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(Math.floor(selected / columns), { align: "auto" });
  }, [selected, columns, virtualizer]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (hits.length === 0) return;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        setSelected((i) => Math.min(i + 1, hits.length - 1));
        setKeyboard(true);
        return;
      case "ArrowLeft":
        event.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
        setKeyboard(true);
        return;
      case "ArrowDown":
        event.preventDefault();
        setSelected((i) => Math.min(i + columns, hits.length - 1));
        setKeyboard(true);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (selected < columns) onExit();
        else {
          setSelected((i) => Math.max(i - columns, 0));
          setKeyboard(true);
        }
        return;
      case "Enter":
        event.preventDefault();
        if (hits[selected] !== undefined) onPick(hits[selected]);
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
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        // Keep the selection while focus moves between cells; drop it only when
        // focus leaves the grid (e.g. back to the search field).
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      className="min-h-0 flex-1 overflow-y-auto outline-none"
    >
      {hits.length === 0 ? (
        <p className="p-4 text-muted-foreground select-none">Tidak ada hasil.</p>
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
                const onHover = () => {
                  setSelected(index);
                  setKeyboard(false);
                };
                const selectedHere = focused && index === selected;
                return hit.kind === "listing" ? (
                  <Cell
                    key={`listing:${hit.listing.id}`}
                    listing={hit.listing}
                    selected={selectedHere}
                    keyboard={keyboard}
                    onHover={onHover}
                    onClick={() => onPick(hit)}
                  />
                ) : (
                  <ComboCell
                    key={`combo:${hit.combo.id}`}
                    combo={hit.combo}
                    components={hit.components}
                    extraNames={hit.extraNames}
                    selected={selectedHere}
                    onHover={onHover}
                    onClick={() => onPick(hit)}
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

function ComboCell({
  combo,
  components,
  extraNames,
  selected,
  onHover,
  onClick,
}: {
  combo: Combo;
  components: Listing[];
  extraNames: string[];
  selected: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const url = useImageUrl(combo.cover?.name ?? null, combo.cover?.mime ?? null);
  const componentSummary = components
    .slice(0, 2)
    .map((listing) => listing.name)
    .join(", ");
  const remaining = components.length - 2;
  const summary = remaining > 0 ? `${componentSummary} +${remaining}` : componentSummary;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseMove={onHover}
      title={`${combo.name}: ${components.length} listing, ${extraNames.length} biaya/potongan; tambahan berlaku untuk seluruh transaksi`}
      aria-label={`Tambah combo ${combo.name}, ${components.length} listing, ${extraNames.length} biaya atau potongan yang berlaku untuk seluruh transaksi`}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden border-b border-r text-left transition-colors hover:bg-accent/50",
        selected && "z-10 bg-primary/10 ring-2 ring-primary ring-inset",
      )}
    >
      <span className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden bg-muted/40">
        {url !== null ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <PackageOpen className="size-8 text-muted-foreground/40" />
        )}
        <span className="absolute left-2 top-2 rounded-md border bg-background/95 px-2 py-0.5 text-xs font-medium">
          Paket
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-2 py-2">
        <span className="truncate text-sm font-medium leading-tight">{combo.name}</span>
        <span className="truncate text-sm leading-tight text-muted-foreground">
          {summary || `${components.length} listing`}
        </span>
        <span className="truncate text-xs text-muted-foreground" title={extraNames.join(", ")}>
          {extraNames.length === 0
            ? `${components.length} listing`
            : `${extraNames[0]}${extraNames.length > 1 ? ` +${extraNames.length - 1}` : ""} · seluruh transaksi`}
        </span>
      </span>
    </button>
  );
}

function Cell({
  listing,
  selected,
  keyboard,
  onHover,
  onClick,
}: {
  listing: Listing;
  selected: boolean;
  keyboard: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const url = useImageUrl(listing.cover?.name ?? null, listing.cover?.mime ?? null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [nameRect, setNameRect] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );
  const [alignRight, setAlignRight] = useState(false);
  const stockClass =
    listing.stock <= 0
      ? "text-destructive"
      : listing.stock <= LOW_STOCK
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  // While navigating by key (and not hovering this card), overlay the full name
  // on top of the truncated name line. Re-measured each render so a scroll does
  // not leave it behind.
  // Intentionally runs after every render (no deps): re-measuring on each render
  // keeps the overlay aligned while the grid scrolls. The equality guard below
  // stops the setState from looping.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const rect =
      selected && keyboard && pointer === null ? nameRef.current?.getBoundingClientRect() : null;
    const next = rect ? { left: rect.left, top: rect.top, width: rect.width } : null;
    setNameRect((previous) =>
      previous === null && next === null
        ? previous
        : previous !== null &&
            next !== null &&
            previous.left === next.left &&
            previous.top === next.top &&
            previous.width === next.width
          ? previous
          : next,
    );

    // Only flip to right-alignment when the one-line name would run off screen;
    // otherwise keep it aligned with the name.
    if (next !== null) {
      const width = overlayRef.current?.offsetWidth ?? 0;
      const overflow = next.left + width > window.innerWidth - 8;
      setAlignRight((previous) => (previous === overflow ? previous : overflow));
    }
  });

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={(event) => {
          onHover();
          setPointer({ x: event.clientX, y: event.clientY });
        }}
        onMouseMove={(event) => {
          onHover();
          setPointer({ x: event.clientX, y: event.clientY });
        }}
        onMouseLeave={() => setPointer(null)}
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
          <span ref={nameRef} className="truncate text-sm font-medium leading-tight">
            {listing.name}
          </span>
          <span className="truncate font-mono text-sm leading-tight text-muted-foreground">
            {listing.code || "tanpa kode"}
          </span>
          <span className="flex items-center justify-between gap-2 text-sm leading-tight tabular-nums">
            <span>{rupiah(listing.price)}</span>
            <span className="text-muted-foreground">×{listing.unit}</span>
            <span className={stockClass}>{listing.stock}</span>
          </span>
        </span>
      </button>
      {pointer !== null
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 max-w-xs rounded-md border bg-popover px-2 py-1 text-sm text-popover-foreground shadow-md"
              style={{ left: pointer.x + 14, top: pointer.y + 14 }}
            >
              {listing.name}
            </div>,
            document.body,
          )
        : null}
      {nameRect !== null
        ? createPortal(
            <div
              ref={overlayRef}
              className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md border bg-popover px-1.5 py-0.5 text-sm leading-tight text-popover-foreground shadow-md"
              style={
                alignRight
                  ? {
                      left: nameRect.left + nameRect.width,
                      top: nameRect.top,
                      transform: "translateX(-100%)",
                    }
                  : { left: nameRect.left, top: nameRect.top }
              }
            >
              {listing.name}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
