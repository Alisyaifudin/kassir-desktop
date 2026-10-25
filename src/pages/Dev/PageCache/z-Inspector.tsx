import { useEffect, useState } from "react";
import { pageCache, type CacheSnapshot } from "~/components/page-data";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const age = (ms: number): string => {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return seconds < 1 ? "baru" : `${seconds} dtk`;
};

/**
 * The store, made visible: what is in it, what it thinks is fresh, and how often
 * it has been believed.
 *
 * It reads the module store directly rather than through a page-data key — that
 * is the whole claim of the design, and showing it is the cheapest way to check
 * it. The panel re-reads on every cache event and on a slow tick (for the ages).
 */
export function Inspector() {
  const [snapshot, setSnapshot] = useState<CacheSnapshot>(() => pageCache.snapshot());

  useEffect(() => pageCache.watch(() => setSnapshot(pageCache.snapshot())), []);
  useEffect(() => {
    const timer = setInterval(() => setSnapshot(pageCache.snapshot()), 500);
    return () => clearInterval(timer);
  }, []);

  const { entries, stats, maxEntries } = snapshot;

  return (
    <section className="mb-3 rounded-xl border bg-background p-3" data-testid="cache-inspector">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-normal font-semibold">Isi cache</h2>
          <p className="text-small text-muted-foreground">
            {entries.length} entri / {maxEntries} · hit {stats.hits} · miss {stats.misses} · tulis{" "}
            {stats.writes} · invalidasi {stats.invalidations} · evict {stats.evictions}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => pageCache.invalidate("orders")}>
            Invalidasi orders
          </Button>
          <Button variant="outline" size="sm" onClick={() => pageCache.invalidate("ledger")}>
            Invalidasi ledger
          </Button>
          <Button variant="outline" size="sm" onClick={() => pageCache.clear()}>
            Kosongkan
          </Button>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="text-small text-muted-foreground">Kosong. Setiap key akan membaca ulang.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {entries.map((entry) => (
            <li
              key={`${entry.tag}-${entry.deps}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 text-small"
              data-entry={entry.tag}
              data-stale={entry.stale ? "true" : "false"}
            >
              <span className="font-medium">{entry.tag}</span>
              <code className="text-muted-foreground">
                {entry.deps === "" ? "(tanpa deps)" : entry.deps.split("\u0000").join(" | ")}
              </code>
              <span className="text-muted-foreground">{entry.kind === "once" ? "baca sekali" : "live"}</span>
              <span
                className={cn(
                  "rounded-full px-1.5",
                  entry.stale
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                )}
              >
                {entry.stale ? "usang" : "segar"}
              </span>
              <span className="text-muted-foreground">
                {entry.hits} hit · {age(entry.at)}
              </span>
              {entry.error === null ? null : <span className="text-destructive">revalidasi gagal</span>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-small text-muted-foreground">
        Tag = identitas bacaan · deps = pertanyaan yang dijawab. Nilai dianggap segar sampai ada
        yang membatalkannya — tidak ada TTL.
      </p>
    </section>
  );
}
