import { formatPrice } from "../../z-ProductBits";
import type { totals as totalsFn } from "./use-performance";

export function Summary({ totals }: { totals: ReturnType<typeof totalsFn> }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="Terjual" value={`${totals.qty.toLocaleString("id-ID")} pcs`} />
      <Card label="Omzet" value={formatPrice(totals.revenue)} />
      <Card label="Laba" value={formatPrice(totals.profit)} accent={totals.profit < 0} />
      <Card label="Margin" value={`${totals.margin.toFixed(1)}%`} accent={totals.margin < 0} />
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3">
      <span className="text-small text-muted-foreground">{label}</span>
      <span
        className={
          accent
            ? "text-normal font-semibold tabular-nums text-destructive"
            : "text-normal font-semibold tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
