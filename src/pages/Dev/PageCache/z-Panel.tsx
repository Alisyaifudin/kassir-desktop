import { useEffect, useState } from "react";
// The one place the prop-driven `Gate` stays, on purpose: this lab's subject is
// the `Result` itself (`useFirstPaint` asks it "were you already data at mount?"),
// so it reads the result *and* draws from it. Every real page uses
// `pageData.Gate`; see `.pi/skills/page-data-migration.md`.
import { Gate } from "~/components/page-data";
import type { Result } from "~/components/Loader";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { LATENCY } from "./z-sources";
import type { LabApi } from "./data";

const rupiah = (value: number) =>
  value.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/**
 * What this widget painted on its **first** frame, and how long the value took
 * to appear. `cache` means the frame was data, not a skeleton — the number is
 * then ~0 ms; `baca` means the widget mounted empty and the figure is the read.
 *
 * It is measured once per mount on purpose: a revalidation that lands later must
 * not rewrite the answer to "was this visit instant?".
 */
function useFirstPaint(res: Result<unknown, unknown>): { paint: "cache" | "baca"; elapsed: number | null } {
  const [startedAt] = useState(() => performance.now());
  const [paint] = useState<"cache" | "baca">(res.type === "success" ? "cache" : "baca");
  const [elapsed, setElapsed] = useState<number | null>(res.type === "success" ? 0 : null);

  useEffect(() => {
    if (elapsed !== null || res.type !== "success") return;
    setElapsed(performance.now() - startedAt);
  }, [res, elapsed, startedAt]);

  return { paint, elapsed };
}

function Rows({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}

function Box({
  title,
  contract,
  paint,
  elapsed,
  note,
  children,
}: {
  title: string;
  contract: string;
  paint: "cache" | "baca";
  elapsed: number | null;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-1.5 rounded-lg border bg-background p-2"
      data-widget={title}
      data-paint={paint}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 className="text-small font-semibold">{title}</h3>
        <code className="text-small text-muted-foreground">{contract}</code>
      </header>

      <div className="min-h-12">{children}</div>

      <footer className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-small font-medium",
            paint === "cache"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          )}
        >
          {paint === "cache" ? "dari cache" : "baca ulang"}
        </span>
        <span className="tabular-nums" data-elapsed={elapsed === null ? "" : Math.round(elapsed)}>
          {elapsed === null ? "…" : elapsed < 1 ? "<1 ms" : `${Math.round(elapsed)} ms`}
        </span>
        {note === undefined ? null : <span className="text-muted-foreground/80">{note}</span>}
      </footer>
    </section>
  );
}

/** Slow read-once: the key the cache exists for. */
function OrdersWidget({ api }: { api: LabApi }) {
  const res = api.use("orders");
  const { paint, elapsed } = useFirstPaint(res);

  return (
    <Box title="Pesanan" contract={`use("orders") · Effect ${LATENCY.orders} ms`} paint={paint} elapsed={elapsed}>
      <Gate res={res} skeleton={<Rows rows={2} />}>
        {({ data, refetching }) => (
          <div className={cn("flex flex-col gap-0.5", refetching && "opacity-50")} aria-busy={refetching || undefined}>
            <p className="font-medium tabular-nums">{data.orders} pesanan</p>
            <p className="text-small text-muted-foreground tabular-nums">{rupiah(data.revenue)}</p>
          </div>
        )}
      </Gate>
    </Box>
  );
}

/** Read-once, scoped by the range picker: deps are part of the cache identity. */
function LedgerWidget({ api, days }: { api: LabApi; days: number }) {
  const res = api.use("ledger");
  const { paint, elapsed } = useFirstPaint(res);

  return (
    <Box
      title="Buku harian"
      contract={`use("ledger") · deps [${days}]`}
      paint={paint}
      elapsed={elapsed}
    >
      <Gate res={res} skeleton={<Rows rows={3} />}>
        {({ data, refetching }) => (
          <ul className={cn("flex flex-col gap-0.5", refetching && "opacity-50")} aria-busy={refetching || undefined}>
            {data.map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-2 text-small">
                <span className="truncate">{row.text}</span>
                <span className="tabular-nums text-muted-foreground">{rupiah(row.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Gate>
    </Box>
  );
}

/** Fast read-once: no cache means a visible flash even at 120 ms. */
function ProfileWidget({ api }: { api: LabApi }) {
  const res = api.use("profile");
  const { paint, elapsed } = useFirstPaint(res);

  return (
    <Box
      title="Profil"
      contract={`use("profile") · Effect ${LATENCY.profile} ms`}
      paint={paint}
      elapsed={elapsed}
    >
      <Gate res={res} skeleton={<Rows rows={2} />}>
        {({ data }) => (
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">{data.name}</p>
            <p className="text-small text-muted-foreground">{data.role}</p>
          </div>
        )}
      </Gate>
    </Box>
  );
}

/** Live `SubscriptionRef`: the cache seed and the stream's replay agree. */
function ActivityWidget({ api }: { api: LabApi }) {
  const res = api.use("activity");
  const { paint, elapsed } = useFirstPaint(res);

  return (
    <Box title="Aktivitas (live)" contract={`use("activity") · Stream`} paint={paint} elapsed={elapsed}>
      <Gate res={res} skeleton={<Rows rows={2} />}>
        {({ data }) => (
          <ul className="flex flex-col gap-0.5">
            {data.map((item) => (
              <li key={item.id} className="truncate text-small">
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </Gate>
    </Box>
  );
}

/**
 * The counter-example. A derived stream restarts its scan on every subscribe, so
 * a cached snapshot is *shown and then contradicted*: this widget is here to be
 * visibly worse with the cache on.
 */
function ClockWidget({ api }: { api: LabApi }) {
  const res = api.use("clock");
  const { paint, elapsed } = useFirstPaint(res);

  return (
    <Box
      title="Detak (stream turunan)"
      contract={`use("clock") · Stream.tick`}
      paint={paint}
      elapsed={elapsed}
      note="jangan di-cache"
    >
      <Gate res={res} skeleton={<Rows rows={1} />}>
        {({ data }) => <p className="text-small tabular-nums">detak ke-{data.tick}</p>}
      </Gate>
    </Box>
  );
}

/** A failure is never cached, so an error cannot become permanent. */
function BrokenWidget({ api }: { api: LabApi }) {
  const res = api.use("broken");
  const { paint, elapsed } = useFirstPaint(res);

  return (
    <Box
      title="Gagal"
      contract={`use("broken") · gagal ${LATENCY.broken} ms`}
      paint={paint}
      elapsed={elapsed}
      note="tidak pernah di-cache"
    >
      <Gate res={res} skeleton={<Rows rows={2} />}>
        {({ data }) => <p className="text-small">{data}</p>}
      </Gate>
    </Box>
  );
}

/**
 * One panel = one `pageData.Provider` over the same six keys. The two panels on
 * the lab page differ only in whether their registry was created with `cache`.
 */
export function Panel({
  api,
  days,
  title,
  note,
  panel,
}: {
  api: LabApi;
  days: number;
  title: string;
  note: string;
  /** `plain` / `cached` — a stable handle for the e2e test, not a style. */
  panel: "plain" | "cached";
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-2" data-panel={panel}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-2 px-1">
        <h2 className="text-normal font-semibold">{title}</h2>
        <p className="text-small text-muted-foreground">{note}</p>
      </header>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <OrdersWidget api={api} />
        <LedgerWidget api={api} days={days} />
        <ProfileWidget api={api} />
        <ActivityWidget api={api} />
        <ClockWidget api={api} />
        <BrokenWidget api={api} />
      </div>
    </section>
  );
}
