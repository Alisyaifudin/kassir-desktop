import { useState } from "react";
import { useDelayedFlag } from "~/components/Loader";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { SkeletonText } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { HistoryTable } from "./z-HistoryTable";
import { type HistoryMode, useHistory } from "./use-history";

const MODES: { id: HistoryMode; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "in", label: "Masuk" },
  { id: "out", label: "Keluar" },
];

/**
 * The journal card: its head, its Masuk/Keluar filter and its "Muat lebih banyak"
 * button are chrome and are drawn from the first frame; only the rows wait.
 *
 * The rows are held back for the same anti-flash window the rest of the app uses
 * — a local page answers in a few milliseconds, and a placeholder for two frames
 * reads as jank — which costs nothing here because the card is a fixed-height
 * column: the placeholder and the rows occupy the same box.
 */
export function History({
  productId,
  revision,
}: {
  productId: string;
  /** The product row's revision; `null` until the row arrives. */
  revision: number | null;
}) {
  const [mode, setMode] = useState<HistoryMode>("all");
  // The filter is a query argument, not a filter over the loaded page: a page of
  // "Keluar" rows used to render "Belum ada pergerakan stok." while the matching
  // "Masuk" rows sat one page back.
  const { events, loading, error, done, loadMore } = useHistory(productId, revision, mode);
  const pending = useDelayedFlag(loading && events.length === 0);

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-small font-semibold">Riwayat</h2>
        <div className="inline-flex rounded-md border p-0.5 text-small">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "rounded px-2 py-0.5 transition-colors",
                mode === item.id ? "bg-muted font-medium" : "text-muted-foreground",
              )}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <TextError>{error}</TextError>

      {/* `-mr-3 pr-3` lets the scroll track sit on the card's edge instead of
          butting against the right-most row item; the padding keeps the content
          inset by the same 12px the card uses. */}
      <div className="-mr-3 min-h-0 flex-1 overflow-y-auto pr-3">
        {events.length > 0 ? (
          <HistoryTable events={events} />
        ) : pending ? (
          <HistorySkeleton />
        ) : loading ? null : (
          <p className="py-6 text-center text-small text-muted-foreground">
            Belum ada pergerakan stok.
          </p>
        )}
      </div>

      {!done ? (
        <Button
          variant="outline"
          className="h-11 text-small small:h-9"
          onClick={loadMore}
          disabled={loading}
        >
          Muat lebih banyak
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The first page of the journal before it lands: the row's own two-line shape —
 * a date line, a meta line, and the amount held at the right — with each text
 * pulsing *inside* its line box, so a placeholder row is the height of a real one
 * at both app sizes.
 */
function HistorySkeleton() {
  return (
    <ul className="flex flex-col divide-y" aria-busy="true" aria-label="Memuat riwayat">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="flex items-center justify-between gap-2 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-small tabular-nums">
              <SkeletonText className="w-32" />
            </span>
            <span className="truncate text-small text-muted-foreground">
              <SkeletonText className="w-24" />
            </span>
          </div>
          <span className="text-small font-medium tabular-nums">
            <SkeletonText className="w-10" />
          </span>
        </li>
      ))}
    </ul>
  );
}
