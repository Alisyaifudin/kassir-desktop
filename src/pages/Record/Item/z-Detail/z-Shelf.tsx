import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useUser } from "~/hooks/use-user";
import type { RecordFull } from "~/services/record";
import { useToDraft } from "../../z-Detail/use-to-draft";
import { Money } from "../../z-Detail/z-Money";
import { DebtDialog } from "./z-Debt";
import { DeleteBtn } from "./z-DeleteBtn";
import { EditDialog } from "./z-Edit";

/**
 * The settlement, and every correction that belongs to the record, in one band
 * that closes the ledger. It sits at the end of the page's one scroll — after the
 * last line and the parties — because it is the last thing the record says, and a
 * band pinned over a long ledger both covered the rows underneath it and made the
 * money look like a separate screen from the goods it priced.
 */
export function Shelf({ record }: { record: RecordFull }) {
  const isAdmin = useUser().role === "admin";
  const draft = useToDraft(record.id, record.mode);
  const copyable = record.listings.length > 0;

  return (
    <section
      aria-label="Penyelesaian"
      className="flex shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2"
    >
      {record.listings.length > 0 || record.extras.length > 0 ? (
        <Money record={record} editable />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {record.isCredit && isAdmin ? (
            <DebtDialog grandTotal={record.grandTotal} recordId={record.id} />
          ) : null}
          <EditDialog record={record} />
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
