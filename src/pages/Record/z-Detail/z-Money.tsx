import { Pencil } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { METHOD_NAMES } from "~/lib/constants";
import type { RecordFull } from "~/services/record";
import { rupiah } from "./extras";
import { usePayments } from "./use-payments";
import { PaymentEditor } from "./z-Payments";

/**
 * The money columns: what was charged above, what was tendered below, each
 * closing with a rule over its answer. The charge rows only grow (`Total`,
 * `Pembulatan`, `Total Keseluruhan`) when there is a rounding to explain —
 * otherwise the single `Total` is the answer.
 *
 * On the full page the payment rows are editable: `Pencil` in their gutter turns
 * them into fields, and `Batalkan | Simpan | +` sits under them. The pane on
 * `/records` passes no `editable`, because a preview points at a record instead
 * of rewriting it — and neither face may print a different figure for the same
 * record.
 */
export function Money({
  record,
  editable = false,
}: {
  record: RecordFull;
  /** Offer the `Pencil` that turns the payment rows into fields. */
  editable?: boolean;
}) {
  const pay = usePayments(record);
  // A zero-pay method carries no money (an unsettled split keeps them), so the
  // band prints only the rows that took something.
  const stored = record.methods.filter((method) => method.pay !== 0);
  const splitDraft = pay.draft.length > 1;
  const pencil =
    editable && !record.isCredit ? (
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="size-6 shrink-0"
        aria-label="Sunting pembayaran"
        title="Sunting pembayaran"
        onClick={pay.start}
      >
        <Pencil className="icon" />
      </Button>
    ) : null;

  return (
    <div className="flex justify-end">
      <div className="grid w-full grid-cols-12 gap-y-0.5 text-normal">
        {record.rounding === 0 ? (
          <>
            <MoneyRule />
            <MoneyRow label="Total" value={rupiah(record.grandTotal, record.fix)} strong />
          </>
        ) : (
          <>
            <MoneyRow label="Total" value={rupiah(record.total, record.fix)} />
            <MoneyRow label="Pembulatan" value={rupiah(record.rounding, record.fix)} />
            <MoneyRule />
            <MoneyRow
              label="Total Keseluruhan"
              value={rupiah(record.grandTotal, record.fix)}
              strong
            />
          </>
        )}

        {record.isCredit ? (
          <MoneyRow label="Kredit" value="Belum dibayar" danger />
        ) : pay.editing ? (
          <>
            <PaymentEditor pay={pay} />
            {splitDraft ? (
              <MoneyRow label="Total Pembayaran" value={rupiah(pay.paid, record.fix)} />
            ) : null}
            <MoneyRule />
            <MoneyRow
              label={pay.change < 0 ? "Kurang" : "Kembalian"}
              value={rupiah(Math.abs(pay.change), record.fix)}
              strong
              danger={pay.change < 0}
            />
          </>
        ) : stored.length === 0 ? (
          // A record with no payment rows at all still has to offer the pencil,
          // or its settlement could never be filled in.
          <MoneyRow label="Dibayar" value={rupiah(record.pay, record.fix)} icon={pencil} />
        ) : (
          <>
            {stored.map((method, index) => (
              <MoneyRow
                key={method.id}
                label={methodLabel(method)}
                value={rupiah(method.pay, record.fix)}
                icon={index === 0 ? pencil : null}
              />
            ))}
            {stored.length > 1 ? (
              <MoneyRow label="Total Pembayaran" value={rupiah(record.pay, record.fix)} />
            ) : null}
            {record.change === 0 ? null : (
              <>
                <MoneyRule />
                <MoneyRow label="Kembalian" value={rupiah(record.change, record.fix)} strong />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The method's own name, falling back to its kind ("Tunai", "QRIS", ...). */
function methodLabel(method: RecordFull["methods"][number]): string {
  const name = method.name?.trim() ?? "";
  return name === "" ? METHOD_NAMES[method.kind] : name;
}

/**
 * One row of the grid: a gutter (the pencil, or nothing), the label, and the
 * figure pinned right. It returns the grid's own cells rather than a row box, so
 * the two columns line up across every row — including the editor's wide rows.
 */
function MoneyRow({
  label,
  value,
  icon,
  strong = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
  icon?: React.ReactNode
}) {
  return (
    <>
      <div className="pr-3 col-span-10 text-right">{icon} {label}</div>
      <div
        className={cn(
          "text-right tabular-nums col-span-2",
          strong && "font-bold",
          danger && "font-bold text-destructive",
        )}
      >
        {value}
      </div>
    </>
  );
}

/** The rule over an answer, drawn across both columns (and the gutter). */
function MoneyRule() {
  return <div className="col-span-12 mt-1 border-t" />;
}
