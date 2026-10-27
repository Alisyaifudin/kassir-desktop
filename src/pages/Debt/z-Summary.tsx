import { HandCoins } from "lucide-react";

/**
 * The debt total. It is summed from the same rows the table shows, so the two
 * cannot disagree — the legacy page kept it in an atom written by the fetch.
 */
export function Summary({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <HandCoins className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-muted-foreground">Total Utang</span>
          <span className="text-sm text-muted-foreground">
            Akumulasi seluruh piutang pelanggan
          </span>
        </div>
      </div>
      <p className="text-end text-2xl font-bold tabular-nums">
        Rp{total.toLocaleString("id-ID")}
      </p>
    </div>
  );
}
