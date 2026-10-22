import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useUser } from "~/hooks/use-user";
import { METHOD_NAMES } from "~/lib/constants";
import type { RecordFull } from "~/services/record";
import { useToDraft } from "../../z-Detail/use-to-draft";
import { rupiah } from "../../z-Detail/extras";
import { DebtDialog } from "./z-Debt";
import { DeleteBtn } from "./z-DeleteBtn";
import { EditDialog } from "./z-Edit";

/**
 * The settlement, and every correction that belongs to the record, in one band
 * pinned under the ledger. It exists because the two questions this page is
 * opened for — "what does this transaction say?" and "who fixes it?" — used to
 * be answered at opposite ends of a long scroll, with the money at the very
 * bottom and the actions split between a footer row and a dialog.
 *
 * Nothing here scrolls. The ledger above can be any length; the four money
 * figures and the five corrections stay where they were the first time.
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
      {record.listings.length > 0 || record.extras.length > 0 ? <Money record={record} /> : null}
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

/**
 * Charged on the left, tendered on the right, each column closing with a rule
 * over its answer: the total and the change. The columns are bottom-aligned so
 * those two rules line up and read as one closing line.
 */
function Money({ record }: { record: RecordFull }) {
  const payments = record.methods.filter((method) => method.pay !== 0);
  const showSubtotal = record.subTotal !== record.grandTotal;

  return (
    <div className="flex justify-end">
      <div className="grid grid-cols-2 items-end gap-x-10">
        <dl className="flex w-[300px] flex-col text-small small:w-[230px]">
          {showSubtotal ? (
            <Row
              label={record.extras.length > 0 ? "Subtotal" : "Sebelum pembulatan"}
              value={rupiah(record.subTotal, record.fix)}
            />
          ) : null}
          {record.rounding === 0 ? null : (
            <Row label="Pembulatan" value={rupiah(record.rounding, record.fix)} />
          )}
          <Row label="Total" value={rupiah(record.grandTotal, record.fix)} strong />
        </dl>

        <dl className="flex w-[300px] flex-col text-small small:w-[230px]">
          {record.isCredit ? (
            <Row label="Kredit" value="Belum dibayar" danger />
          ) : (
            <>
              {/* Split payments list each method and then their sum; a single
                  one is its own label, so the method is never lost. */}
              {payments.length > 1
                ? payments.map((method) => (
                    <Row
                      key={method.id}
                      label={methodLabel(method)}
                      value={rupiah(method.pay, record.fix)}
                    />
                  ))
                : null}
              <Row
                label={payments.length === 1 ? methodLabel(payments[0]) : "Dibayar"}
                value={rupiah(record.pay, record.fix)}
              />
              <Row label="Kembalian" value={rupiah(record.change, record.fix)} strong />
            </>
          )}
        </dl>
      </div>
    </div>
  );
}

/** The method's own name, falling back to its kind ("Tunai", "QRIS", ...). */
function methodLabel(method: RecordFull["methods"][number]): string {
  const name = method.name?.trim() ?? "";
  return name === "" ? METHOD_NAMES[method.kind] : name;
}

function Row({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "mt-1 flex items-baseline justify-between gap-3 border-t pt-1"
          : "flex items-baseline justify-between gap-3"
      }
    >
      <dt>{label}</dt>
      <dd
        className={
          danger
            ? "tabular-nums font-bold text-destructive"
            : strong
              ? "text-normal font-bold tabular-nums"
              : "tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
