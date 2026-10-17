import { rupiah } from "../util-rupiah";

/**
 * The two numbers the operator looks for after paying: what the purchase came
 * to, and what came back. The sale screen's counterpart is "Kembalian" too —
 * a restock that is paid in cash can be overpaid just as easily.
 */
export function Summary({ total, change }: { total: number; change: number }) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex items-end justify-between border-b pb-4">
        <span className="pb-2 font-medium text-muted-foreground select-none">Total</span>
        <span className="text-big font-bold leading-none tabular-nums">{rupiah(total)}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="pb-2 font-medium text-muted-foreground select-none">Kembalian</span>
        <span className="text-grand-total font-bold leading-none tabular-nums text-primary">
          {rupiah(change)}
        </span>
      </div>
    </div>
  );
}
