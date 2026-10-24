import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useUser } from "~/hooks/use-user";
import type { RecordFull } from "~/services/record";
import { DeleteBtn } from "./DeleteBtn";
import { Money } from "./z-Money";
import { useToDraft } from "./use-to-draft";

/**
 * The settlement, and what this pane can do about it, in one band that closes the
 * ledger. It is the full page's shelf with the corrections taken out: a preview
 * does not edit a record — no dates, no note, no payment — it only points at it.
 * So the band keeps the money and the three ways out:
 *
 * - `Lihat` opens the record in full, which is where its corrections live;
 * - `Jadikan Transaksi` rings the same goods up again as a fresh cart;
 * - `Hapus` (admin) drops it.
 *
 * It rides in the ledger's own scroll (`z-Ledger.tsx`), like the page's, so a long
 * record ends with its money instead of losing it behind a pinned band.
 */
export function Shelf({ record }: { record: RecordFull }) {
  const isAdmin = useUser().role === "admin";
  const draft = useToDraft(record.id, record.mode);
  const { pathname, search } = useLocation();
  const back = encodeURIComponent(`${pathname}${search}`);
  const copyable = record.listings.length > 0;

  return (
    <section
      aria-label="Penyelesaian"
      className="flex shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2"
    >
      {record.listings.length > 0 || record.extras.length > 0 ? <Money record={record} /> : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={{ pathname: `/records/${record.id}`, search: `?url_back=${back}` }}>
              Lihat
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-fit"
            disabled={draft.loading || !copyable}
            title={copyable ? undefined : "Catatan tanpa barang tidak bisa dijadikan transaksi"}
            onClick={() => void draft.copy()}
          >
            Jadikan Transaksi <Spinner when={draft.loading} />
          </Button>
        </div>
        {isAdmin ? <DeleteBtn recordId={record.id} /> : null}
      </div>
      <TextError>{draft.error}</TextError>
    </section>
  );
}
