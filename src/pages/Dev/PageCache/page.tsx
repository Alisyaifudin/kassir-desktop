import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { pageCache } from "~/components/page-data";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { cachedData, labSources, plainData } from "./data";
import { Panel } from "./z-Panel";
import { Inspector } from "./z-Inspector";
import { pushActivity, resetWorld, writeElsewhere } from "./z-sources";

/**
 * The cache experiment.
 *
 * Two identical panels over the same six keys, mounted side by side: the left one
 * is the layer as it ships (`plainData`), the right one opts into `pageCache`
 * (`cachedData`). The only difference between them is the store, so every
 * visible difference is the cache.
 *
 * The workflow this page is built for:
 *
 * 1. Mount, let everything land. Both panels read; both say "baca ulang".
 * 2. **Lepas panel** then **Kembali ke halaman** — a real unmount/remount, what a
 *    route change does. The cached panel paints its data with `<1 ms`; the plain
 *    panel starts from skeletons again.
 * 3. **Tulis tanpa invalidasi** then remount: the cache still shows the old
 *    number. That is the trade the design chooses — nothing re-reads until
 *    something says it moved — and step 4 is the answer to it.
 * 4. **Tulis + invalidasi**: the mounted cached panel revalidates on the spot
 *    (the number dims, then updates), and a later remount reads instead of
 *    painting.
 * 5. Switch the range 7 → 30 → 7: the 7-day answer comes back from the store,
 *    because deps are part of the cache identity, not a reason to forget.
 */
export default function Page() {
  const [mounted, setMounted] = useState(true);
  const [days, setDays] = useState(7);
  const [writes, setWrites] = useState(0);

  // One sources object for both panels: only the cache can explain a difference.
  const sources = useMemo(() => labSources(days), [days]);

  // A fresh lab every time the route is opened: the store is module-level, so a
  // previous run's entries would otherwise be the first thing on screen.
  useEffect(() => {
    resetWorld();
    return () => {
      resetWorld();
    };
  }, []);

  return (
    <main className="h-[calc(100vh-68px)] w-full overflow-y-auto bg-muted/40 p-4 small:h-[calc(100vh-44px)] small:p-3">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <h1 className="text-big font-bold">Page cache playground</h1>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-small text-emerald-600 dark:text-emerald-400">
              memori · invalidasi eksplisit
            </span>
          </div>
          <p className="max-w-3xl text-small text-muted-foreground">
            Kiri: perilaku sekarang (setiap mount membaca). Kanan: <code>cache: true</code> — nilai
            terakhir disimpan di luar React, dicat di frame pertama, dan hanya dibaca ulang kalau
            ada yang membatalkannya. Angka di bawah tiap kotak = waktu dari mount sampai nilai
            pertama tampil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setMounted((value) => !value)}>
            {mounted ? "Lepas panel" : "Kembali ke halaman"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              writeElsewhere();
              setWrites((value) => value + 1);
            }}
          >
            Tulis tanpa invalidasi
          </Button>
          <Button
            size="sm"
            onClick={() => {
              writeElsewhere();
              setWrites((value) => value + 1);
              pageCache.invalidate("orders", "ledger");
            }}
          >
            Tulis + invalidasi
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              pushActivity(`Aktivitas baru #${writes + 1}`);
              setWrites((value) => value + 1);
            }}
          >
            Siarkan aktivitas
          </Button>
          <Link
            to="/dev/page-data"
            className="rounded-md border px-2 py-1 text-small hover:bg-accent"
          >
            Navigasi ke page-data →
          </Link>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-background px-3 py-2">
        <span className="text-small text-muted-foreground">Rentang:</span>
        {[7, 30].map((option) => (
          <Button
            key={option}
            size="sm"
            variant={days === option ? "default" : "outline"}
            onClick={() => setDays(option)}
          >
            {option} hari
          </Button>
        ))}
        <span className="text-small text-muted-foreground">
          {writes} tulis di luar halaman ini · deps = [{days}]
        </span>
      </div>

      <Inspector />

      <div className={cn("grid grid-cols-1 gap-3 pb-8 xl:grid-cols-2")}>
        {mounted ? (
          <>
            <plainData.Provider sources={sources} deps={[days]}>
              <Panel
                api={plainData}
                panel="plain"
                days={days}
                title="Tanpa cache"
                note="setiap mount membaca ulang"
              />
            </plainData.Provider>
            <cachedData.Provider sources={sources} deps={[days]}>
              <Panel
                api={cachedData}
                panel="cached"
                days={days}
                title="Dengan cache"
                note="cat dari store, baca hanya saat usang"
              />
            </cachedData.Provider>
          </>
        ) : (
          <div className="xl:col-span-2 rounded-xl border border-dashed bg-background p-6 text-center">
            <p className="text-normal font-medium">Kedua panel dilepas.</p>
            <p className="text-small text-muted-foreground">
              Ini yang terjadi saat berpindah halaman. Tekan “Kembali ke halaman” — panel kiri
              mulai dari skeleton lagi, panel kanan sudah berisi.
            </p>
          </div>
        )}
      </div>

      <footer className="pb-6 text-small text-muted-foreground">
        Rute ini hanya ada di build DEV. Sumber palsunya ada di <code>z-sources.ts</code>, store-nya
        di <code>~/components/page-data/z-cache.ts</code>.
      </footer>
    </main>
  );
}
