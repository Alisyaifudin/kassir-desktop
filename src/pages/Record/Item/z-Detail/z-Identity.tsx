import { Show } from "~/components/Show";
import { useUser } from "~/hooks/use-user";
import { formatDate, formatTime } from "~/lib/date";
import { capitalize, cn } from "~/lib/utils";
import type { RecordFull } from "~/services/record";
import { CreditAt } from "./z-CreditAt";
import { PaidAt } from "./z-PaidAt";

/**
 * What this page is about, before any of its numbers: which way the money moved,
 * whether it is settled, which id, and which day it belongs to. It sits above
 * the ledger and never scrolls, so a page read to the last line still answers
 * "what am I looking at?".
 *
 * The mode and state chips are the same vocabulary the receipt prints (Jual /
 * Beli, Lunas / Kredit); colour is spent on the state only, because "unpaid" is
 * the one thing here that changes what the reader should do next.
 */
export function Identity({ record }: { record: RecordFull }) {
  const isAdmin = useUser().role === "admin";
  const purchase = record.mode === "outcoming";

  return (
    <header className="flex shrink-0 flex-col gap-1 border-b px-1 pb-2">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md bg-secondary px-2  font-bold">
            {purchase ? "Beli" : "Jual"}
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5  font-bold",
              record.isCredit
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-500",
            )}
          >
            <span aria-hidden className="size-2 rounded-full bg-current" />
            {record.isCredit ? "Kredit" : "Lunas"}
          </span>
          {/* A ULID does not break by itself; let it truncate rather than push
              the date out of the band. The full id is on the receipt. */}
          <p className="min-w-0 truncate  text-muted-foreground" title={record.id}>
            No: {record.id}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 text-small text-muted-foreground">
        <p className="min-w-0 truncate ">
          Kasir {capitalize(record.cashier)} · Dibuat {formatDate(record.createdAt, "long")}{" "}
          {formatTime(record.createdAt, "short")}
        </p>
        <Show when={isAdmin}>
          <div className="flex shrink-0 items-center gap-1">
            <PaidAt record={record} />
            <CreditAt record={record} />
          </div>
        </Show>
      </div>
    </header>
  );
}
