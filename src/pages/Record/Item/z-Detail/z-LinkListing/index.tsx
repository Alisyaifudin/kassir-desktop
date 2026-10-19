import { useState } from "react";
import { Effect } from "effect";
import { ExternalLink } from "lucide-react";
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
import { service } from "~/services";
import type { RecordListing } from "~/services/record";

/**
 * Re-points a line's stock portion at another lot of the same product. The
 * movement is transferred (the old lot gets its pcs back, the chosen lot gives
 * them up) and the event is re-stamped with the new lot's capital.
 *
 * A line split across lots has one portion per lot; only a single-portion line
 * is offered here for now.
 */
export function LinkListing({ listing }: { listing: RecordListing }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" asChild title="Ubah lot stok">
        <DialogTrigger>
          <ExternalLink className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-3xl">
        {open ? <Picker listing={listing} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Picker({ listing, onDone }: { listing: RecordListing; onDone: () => void }) {
  const res = useStream(service.product.get.changesFull);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portion = listing.portions.length === 1 ? listing.portions[0] : null;

  async function choose(stockId: string) {
    if (portion === null) return;
    setBusy(true);
    setError(null);
    const result = await Effect.runPromise(
      service.record.set.linkStock(portion.id, stockId).pipe(Effect.either),
    );
    setBusy(false);
    if (result._tag === "Left") {
      setError(result.left.message);
      return;
    }
    onDone();
  }

  return (
    <Loader res={res} fallback={<Spinner when />}>
      {({ data: products }) => {
        if (portion === null) {
          return (
            <p className="text-small text-muted-foreground">
              Baris ini terdiri dari beberapa lot; belum bisa dipindah dari sini.
            </p>
          );
        }
        if (portion.productEventId === null) {
          return (
            <p className="text-small text-muted-foreground">
              Baris ini tidak punya pergerakan stok.
            </p>
          );
        }
        const product = products.find((item) => item.id === portion.productId);
        if (product === undefined) {
          return <p className="text-small text-muted-foreground">Produk tidak ditemukan.</p>;
        }
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-normal">Ubah lot stok</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <p className="text-small text-muted-foreground">
                {listing.name} · {listing.qty} × {listing.price.toLocaleString("id-ID")}
              </p>
              <TextError>{error}</TextError>
              <div className="flex flex-col gap-2">
                {product.stocks.map((lot) => (
                  <Button
                    key={lot.id}
                    variant="outline"
                    disabled={busy}
                    onClick={() => void choose(lot.id)}
                    className="justify-between"
                  >
                    <span className="font-mono text-small">{lot.id.slice(0, 8)}</span>
                    <span className="tabular-nums">
                      {lot.value} pcs · Rp{lot.capital.toLocaleString("id-ID")}/pc
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </>
        );
      }}
    </Loader>
  );
}
