import { ReceiptText } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { formatTime } from "~/lib/date";
import { capitalize, cn } from "~/lib/utils";
import type { Record as RecordModel } from "~/services/record";
import { formatMoney, withUrlBack } from "./format";
import { Card, CardHead, CardLink } from "./z-Card";

/** Six rows plus the card's head and foot finish inside a 1440x900 viewport. */
const VISIBLE = 6;

/**
 * Above `sm` the row is a five-column table line; below it, two lines — when and
 * who, then the kind and its state — with the amount held at the right on both.
 * Same data, no squeezing: a 390px window still reads every cell.
 */
const COLS = "sm:grid sm:grid-cols-[96px_minmax(0,1fr)_80px_auto] sm:items-center sm:gap-3";

export function Ledger({ records }: { records: RecordModel[] }) {
  const shown = records.slice(0, VISIBLE);
  const rest = records.length - shown.length;

  return (
    <Card>
      <CardHead
        title="Transaksi hari ini"
        action={<CardLink to={withUrlBack("/records")}>Riwayat</CardLink>}
      />

      {records.length === 0 ? (
        <Empty />
      ) : (
        <>
          <ul className="flex flex-col divide-y">
            {shown.map((record) => (
              <li key={record.id}>
                <Row record={record} />
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-2">
        <span className="text-small text-muted-foreground">{records.length} transaksi</span>
        {rest > 0 ? <CardLink to={withUrlBack("/records")}>Lihat {rest} lagi</CardLink> : null}
      </div>
    </Card>
  );
}

const ROW =
  "px-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none";

function Row({ record }: { record: RecordModel }) {
  const to = withUrlBack(`/records/${record.id}`);
  const kind = record.mode === "incoming" ? "Jual" : "Beli";

  return (
    <>
      {/* Narrow windows: two lines, with the amount spanning both so the time,
          the kind and the state keep the full width of the first column. */}
      <Link
        to={to}
        className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2.5 sm:hidden", ROW)}
      >
        <span className="truncate">{capitalize(record.cashier)}</span>
        <span className="row-span-2 self-center text-right font-semibold tabular-nums">
          {formatMoney(record.grandTotal)}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
          <span className="tabular-nums">{formatTime(record.date)}</span>
          {kind}
          <Status record={record} />
        </span>
      </Link>

      <Link to={to} className={cn(COLS, "hidden py-2", ROW, "sm:grid")}>
        <span className="text-normal text-muted-foreground tabular-nums">
          {formatTime(record.date)}
        </span>
        <span className="truncate">{capitalize(record.cashier)}</span>
        <span className="text-normal text-muted-foreground">{kind}</span>
        <span className="text-right font-semibold tabular-nums">
          {formatMoney(record.grandTotal)}
        </span>
      </Link>
    </>
  );
}

/** The record page's own vocabulary: a dot and the word, never colour alone. */
function Status({ record, className }: { record: RecordModel; className?: string }) {
  const credit = record.isCredit;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-small",
        credit ? "text-destructive" : "text-emerald-600 dark:text-emerald-500",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {credit ? "Kredit" : "Lunas"}
    </span>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ReceiptText aria-hidden="true" className="size-6" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">Belum ada transaksi hari ini</p>
        <p className="text-small text-muted-foreground">
          Transaksi yang dicatat akan muncul di sini.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={withUrlBack("/pos")}>Buka Toko</Link>
      </Button>
    </div>
  );
}
