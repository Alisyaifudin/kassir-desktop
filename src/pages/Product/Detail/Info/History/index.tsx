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
        <h2 className="font-semibold">Riwayat</h2>
        <div className="inline-flex rounded-md border p-0.5 text-normal">
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-normal text-muted-foreground">
            {loading ? "Memuat…" : "Belum ada pergerakan stok."}
          </p>
        ) : (
          <HistoryTable events={filtered} />
        )}
      </div>

      {!done ? (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
          Muat lebih banyak
        </Button>
      ) : null}
    </div>
  );
}
