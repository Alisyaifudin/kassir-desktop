import { Filter, Plus, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { pageData } from "./data";
import { devSources } from "./z-sources";
import { Monitor, Ticker } from "./z-Monitor";
import {
  ActivityCard,
  BeatCard,
  BrokenCard,
  FeedCard,
  MutationCard,
  PairCard,
  ProfileCard,
  StatsCard,
} from "./z-Widgets";

/**
 * The playground for `~/components/page-data`.
 *
 * Nothing in here waits for data except the six widgets' bodies. The header, the
 * toolbar, the cards' frames, the status strip and the footnote all paint on the
 * first frame, and the uptime counter keeps ticking — that is the difference
 * between gating a page and gating a widget.
 */
export default function Page() {
  return (
    <pageData.Provider sources={devSources}>
      <main className="h-[calc(100vh-68px)] w-full overflow-y-auto bg-muted/40 p-4 small:h-[calc(100vh-44px)] small:p-3">
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <h1 className="text-big font-bold">Page data playground</h1>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-small text-emerald-600 dark:text-emerald-400">
                statis · langsung tampil
              </span>
            </div>
            <p className="max-w-3xl text-small text-muted-foreground">
              Setiap kotak memuat datanya sendiri. Chrome halaman tidak menunggu apa pun —
              waktu berjalan: <Ticker />.
            </p>
          </div>

          {/* Static toolbar: interactive from the first frame, never blocked. */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="size-4 small:size-3.5" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="size-4 small:size-3.5" />
              Segarkan
            </Button>
            <Button size="sm">
              <Plus className="size-4 small:size-3.5" />
              Tambah
            </Button>
          </div>
        </header>

        <Monitor />

        <div className="grid grid-cols-1 gap-3 pb-8 md:grid-cols-2 xl:grid-cols-3">
          <ProfileCard />
          <StatsCard />
          <PairCard />
          <FeedCard />
          <ActivityCard />
          <BrokenCard />
          <BeatCard />
          <MutationCard />
        </div>

        <footer className="pb-6 text-small text-muted-foreground">
          Rute ini hanya ada di build DEV (<code>import.meta.env.DEV</code>) dan tidak memakai
          layanan sungguhan — sumbernya ada di <code>z-sources.ts</code>.
        </footer>
      </main>
    </pageData.Provider>
  );
}
