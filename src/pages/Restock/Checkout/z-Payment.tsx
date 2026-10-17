import { Input } from "~/components/ui/input";
import { Complete } from "../Complete";
import { cn } from "~/lib/utils";
import { PAYMENT } from "../mock";
import { rupiah } from "../util-rupiah";

/**
 * The payment form: what is being rounded, how much is handed over, and what
 * comes back.
 *
 * The submit button belongs to `Complete/` — pressing Bayar opens the settled
 * result, and owning the trigger next to its own dialog keeps the two from
 * drifting apart. On the sale screen they were separated by a store atom.
 */
export function Payment() {
  const change = PAYMENT.change;
  return (
    <form
      className="flex flex-1 flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Row label="Pembulatan">
        <Input type="number" step="any" defaultValue={PAYMENT.rounding} aria-autocomplete="list" />
      </Row>
      <Row label="Bayar">
        <Input
          type="number"
          id="paid-input"
          defaultValue={PAYMENT.paid}
          className="text-right"
          aria-autocomplete="list"
        />
      </Row>
      <Row label="Kembalian">
        <span
          className={cn(
            "px-1 text-change tabular-nums select-none",
            change < 0 && "bg-destructive text-primary-foreground",
          )}
        >
          {rupiah(change)}
        </span>
      </Row>
      <div className="flex w-full items-center gap-1">
        <Complete />
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[170px_10px_1fr] items-center small:grid-cols-[120px_10px_1fr]">
      <span className="select-none">{label}</span>:
      <span className="min-w-0">{children}</span>
    </label>
  );
}
