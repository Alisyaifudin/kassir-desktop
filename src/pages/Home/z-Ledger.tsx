import { ReceiptText } from "lucide-react";
import { Link } from "react-router";
import { Gate } from "~/components/page-data";
import { Button } from "~/components/ui/button";
import { Skeleton, SkeletonText } from "~/components/ui/skeleton";
import { formatTime } from "~/lib/date";
import { MODE_NAMES } from "~/lib/constants";
import { capitalize, cn } from "~/lib/utils";
import type { Record as RecordModel } from "~/services/record";
import { pageData } from "./data";
import { formatMoney, withUrlBack } from "./format";
import { Card, CardHead, CardLink } from "./z-Card";
import { RegionError } from "./z-Error";

/** Six rows plus the card's head and foot finish inside a 1440x900 viewport. */
const VISIBLE = 6;

/**
 * The rows area is reserved from the first frame — four rows big or small — and
 * both the skeleton and the rows live inside it. That is what lets `Gate` keep
 * its anti-flash delay: the placeholder can be held back 200 ms without the card
 * moving, and a quiet day does not shrink the card when the rows arrive.
 */
const ROWS_FLOOR = "min-h-[275px] small:min-h-[176px]";
/** One placeholder line, the height of a real row at either app size. */
const SKELETON_ROW =
  "flex min-h-[52px] small:min-h-[44px] items-center justify-between gap-3 px-4";

/**
 * Above `sm` the row is a five-column table line; below it, two lines — when and
 * who, then the kind and its state — with the amount held at the right on both.
 * Same data, no squeezing: a 390px window still reads every cell.
 */
const COLS = "sm:grid sm:grid-cols-[96px_minmax(0,1fr)_80px_auto] sm:items-center sm:gap-3";

/**
 * The ledger: the card and its head are static, only the rows wait for `records`.
 * The head's "Riwayat" link works before a single row has arrived.
 */
export function Ledger() {
  const res = pageData.use("records");
  const records = res.type === "success" ? res.data : null;

  return (
    <Card>
      <CardHead
        title="Transaksi hari ini"
        action={<CardLink to={withUrlBack("/records")}>Riwayat</CardLink>}
      />
      <div className={cn("flex flex-col", ROWS_FLOOR)}>
        <Gate
          res={res}
          skeleton={<LedgerSkeleton />}
          error={(error) => (
            <div className="p-3">
              <RegionError title="Gagal memuat transaksi hari ini" error={error} />
            </div>
          )}
        >
          {({ data }) => <LedgerRows records={data} />}
        </Gate>
      </div>
      {/* The foot is chrome like the head: it holds its line while the rows
          load, and only the count pulses inside it. */}
      {res.type === "error" ? null : (
        <div className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-2">
          <span className="flex items-center gap-1 text-small text-muted-foreground">
            {records === null ? (
              <SkeletonText className="w-4" />
            ) : (
              <span className="tabular-nums">{records.length}</span>
            )}
            {/* Whitespace is not a flex item, so this changes nothing on screen;
                it is here so the line copies as "1 transaksi". */}
            {" "}
            <span>transaksi</span>
          </span>
          {records !== null && records.length > VISIBLE ? (
            <CardLink to={withUrlBack("/records")}>Lihat {records.length - VISIBLE} lagi</CardLink>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function LedgerRows({ records }: { records: RecordModel[] }) {
  if (records.length === 0) return <Empty />;

  return (
    <ul className="flex flex-col divide-y">
      {records.slice(0, VISIBLE).map((record) => (
        <li key={record.id}>
          <Row record={record} />
        </li>
      ))}
    </ul>
  );
}

function LedgerSkeleton() {
  return (
    <div className="flex flex-col divide-y" aria-busy="true" aria-label="Memuat transaksi">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={SKELETON_ROW}>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

const ROW =
  "px-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none";

function Row({ record }: { record: RecordModel }) {
  const to = withUrlBack(`/records/${record.id}`);
  const kind = MODE_NAMES[record.mode];

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
