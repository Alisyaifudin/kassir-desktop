import { useState } from "react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { HistoryTable } from "./z-HistoryTable";
import { useHistory } from "./use-history";

type Mode = "all" | "in" | "out";

const MODES: { id: Mode; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "in", label: "Masuk" },
  { id: "out", label: "Keluar" },
];

export function History({ productId, revision }: { productId: string; revision: number }) {
  const [mode, setMode] = useState<Mode>("all");
  const { events, loading, error, done, loadMore } = useHistory(productId, revision);

  const filtered = events.filter((event) =>
    mode === "all" ? true : mode === "in" ? event.value > 0 : event.value < 0,
  );

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
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-small text-muted-foreground">
            {loading ? "Memuat…" : "Belum ada pergerakan stok."}
          </p>
        ) : (
          <HistoryTable events={filtered} />
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
