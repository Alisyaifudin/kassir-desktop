import { useEffect, useState } from "react";
import { messageOf } from "~/components/page-data";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { pageData, type DemoPageData } from "./data";
import { LATENCY } from "./z-sources";

/**
 * The page-level state, made visible.
 *
 * This is the thing the old pattern had nowhere to put: one place that knows
 * every key's status while the page is still painting itself. A header counter, a
 * "syncing" chip, or a debug panel reads the same snapshot.
 */
export function Monitor() {
  const snapshot = pageData.useSnapshot();
  const refresh = pageData.useRefresh();

  return (
    <section className="mb-3 rounded-xl border bg-background p-3">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-normal font-semibold">Status data halaman</h2>
          <code className="text-small text-muted-foreground">useSnapshot()</code>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          Muat ulang semua
        </Button>
      </header>

      <ul className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(snapshot) as (keyof DemoPageData)[]).map((key) => {
          const res = snapshot[key];
          const refetching = res.type === "success" && res.refetching === true;
          const status =
            res.type === "init"
              ? "menunggu"
              : res.type === "error"
                ? "gagal"
                : refetching
                  ? "menyegarkan"
                  : "siap";

          return (
            <li
              key={key}
              className="flex items-center gap-2 rounded-md border px-2 py-1"
              title={res.type === "error" ? messageOf(res.error) : undefined}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  res.type === "init" && "animate-pulse bg-muted-foreground/40",
                  res.type === "error" && "bg-destructive",
                  res.type === "success" && (refetching ? "bg-amber-500" : "bg-emerald-500"),
                )}
              />
              <span className="text-small font-medium">{key}</span>
              <span className="text-small text-muted-foreground">{status}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-small text-muted-foreground">
        Semua key mulai berlangganan bersamaan; urutan siap mengikuti latensi masing-masing
        ({LATENCY.profile} ms → {LATENCY.broken} ms → {LATENCY.stats} ms → {LATENCY.feed} ms),
        bukan jumlah totalnya.
      </p>
    </section>
  );
}

/** Ticks while the page is alive — proof the static UI is not blocked by data. */
export function Ticker() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  return <span className="tabular-nums">{((now - start) / 1000).toFixed(1)} dtk</span>;
}
