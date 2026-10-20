import { useEffect, useMemo, useRef, useState } from "react";
import { Effect } from "effect";
import { ExternalLink, X } from "lucide-react";
import { Loader, useStream } from "~/components/Loader";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { getStockIndex, searchStocks, type SearchableStock } from "~/lib/search/stocks";
import { service } from "~/services";
import type { ProductFull } from "~/services/product";
import type { RecordListing } from "~/services/record";
import { StockGrid, type StockRow } from "./z-StockGrid";

/**
 * Re-points a line's stock portion at another lot. The search is global — the
 * chosen lot may belong to another product, in which case the line's product and
 * capital follow it. Selecting the current lot again, or pressing `x`, unlinks
 * it (the event stays in the journal with `stock_id = NULL`).
 *
 * A line split across lots has one portion per lot; only a single-portion line
 * is offered here for now.
 */
export function LinkStock({ listing }: { listing: RecordListing }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" asChild title="Ubah lot stok">
        <DialogTrigger>
          <ExternalLink className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-3 p-4">
        {open ? <Picker listing={listing} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Picker({ listing }: { listing: RecordListing }) {
  const res = useStream(service.product.get.changesFull);
  return (
    <Loader res={res} fallback={<Spinner when />}>
      {({ data: products }) => <Body listing={listing} products={products} />}
    </Loader>
  );
}

function Body({ listing, products }: { listing: RecordListing; products: ProductFull[] }) {
  const portion = listing.portions.length === 1 ? listing.portions[0] : null;
  const [selectedId, setSelectedId] = useState<string | null>(portion?.stockId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // The record stream refreshes after a move, so keep the local highlight in
  // step with the stored link.
  useEffect(() => {
    setSelectedId(portion?.stockId ?? null);
  }, [portion?.stockId]);

  // Radix focuses the dialog itself; wait one tick so the field wins.
  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  const catalogue = useMemo(() => {
    const rows = new Map<string, StockRow>();
    const searchable: SearchableStock[] = [];
    for (const product of products) {
      for (const stock of product.stocks) {
        rows.set(stock.id, { stock, product });
        searchable.push({
          id: stock.id,
          productId: product.id,
          productName: product.name,
          altNames: product.altNames,
          listings: product.listings.map((item) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            price: item.price,
            unit: item.unit,
          })),
        });
      }
    }
    return { rows, searchable };
  }, [products]);

  const index = useMemo(() => getStockIndex(catalogue.searchable), [catalogue]);
  const hits = useMemo(
    () => (query.trim() === "" ? [] : searchStocks(index, query)),
    [index, query],
  );

  const selected = selectedId === null ? undefined : catalogue.rows.get(selectedId);

  async function choose(next: string | null) {
    if (portion === null || busy) return;
    // Clicking the already-selected card behaves like the `x`.
    const target = next !== null && next === selectedId ? null : next;
    if (target === selectedId) return;

    // Paint the new lot immediately; roll back if the service refuses the move.
    const previous = selectedId;
    setSelectedId(target);
    setBusy(true);
    setError(null);
    const result = await Effect.runPromise(
      service.record.set.linkStock(portion.id, target).pipe(Effect.either),
    );
    setBusy(false);
    if (result._tag === "Left") {
      setSelectedId(previous);
      setError(result.left.message);
      return;
    }
  }

  if (portion === null) {
    return (
      <p className="text-small text-muted-foreground">
        Baris ini terdiri dari beberapa lot; belum bisa dipindah dari sini.
      </p>
    );
  }
  if (portion.productEventId === null) {
    return (
      <p className="text-small text-muted-foreground">Baris ini tidak punya pergerakan stok.</p>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-normal">Pilih lot stok</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-small">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-medium">{listing.name}</span>
          <span className="shrink-0 tabular-nums">
            {listing.qty} × Rp{listing.price.toLocaleString("id-ID")}
          </span>
        </div>
        <span className="tabular-nums text-muted-foreground">
          Unit ×{listing.unit} · modal Rp{listing.capital.toLocaleString("id-ID")}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-small">
        {selected === undefined ? (
          <span className="text-muted-foreground">Belum ada lot terpilih.</span>
        ) : (
          <>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{selected.product.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {selected.stock.value} pcs · Rp{selected.stock.capital.toLocaleString("id-ID")}
                /pc
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={busy}
              onClick={() => void choose(null)}
              aria-label="Lepaskan lot"
            >
              <X className="size-4" />
            </Button>
          </>
        )}
      </div>

      <TextError>{error}</TextError>

      <Input
        ref={searchRef}
        type="search"
        value={query}
        placeholder="Cari nama produk, listing, atau kode…"
        onChange={(event) => setQuery(event.currentTarget.value)}
      />

      {query.trim() === "" ? (
        <p className="p-4 text-small text-muted-foreground">Ketik untuk mencari lot stok.</p>
      ) : (
        <StockGrid
          hits={hits}
          rows={catalogue.rows}
          selectedId={selectedId}
          onPick={(id) => void choose(id)}
        />
      )}

      {busy ? <span className="text-small text-muted-foreground">Memindah lot…</span> : null}
    </>
  );
}
