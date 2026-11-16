import { useMemo, useState } from "react";
import { Effect } from "effect";
import { FileDown, FileJson } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useMutation } from "~/components/Loader";
import { saveBytes, saveJson } from "~/lib/export";
import { cn } from "~/lib/utils";
import { useTime } from "~/hooks/use-time";
import { labelOf, PERIOD_KINDS, rangeOf, type PeriodKind } from "~/services/report/period";
import { service } from "~/services";
import type { Info } from "~/services/info";
import type { PeriodDay, ReportTotals } from "~/services/report";
import { toReportData, toReportJson } from "~/services/report/print";
import { pageData } from "./data";
import { PaneSkeleton } from "./z-Loading";
import { ReportErrorFallback } from "./z-Error";
import { usePeriod } from "./use-period";
import { useReportPdf, renderReportPdf } from "./use-pdf";
import { useView } from "./use-view";

/** What closing a period is called, per kind. */
const CLOSE_LABEL: Record<PeriodKind, string> = {
  day: "Buat laporan",
  week: "Buat laporan mingguan",
  month: "Buat laporan bulanan",
  quarter: "Buat laporan kuartalan",
  year: "Buat laporan tahunan",
};

const TAB_LABEL: Record<PeriodKind, string> = {
  day: "Hari",
  week: "Minggu",
  month: "Bulan",
  quarter: "Kuartal",
  year: "Tahun",
};

/**
 * The report itself: the PDF, the two downloads, and the period it covers.
 *
 * The report body is never stored (§3.3) — it is recomputed from `totals` on every
 * open and handed to `report_pdf`, which draws A4 in Rust. What is stored is only
 * the *claim* that a period was closed, which is what `started` reads.
 */
export function Viewer({ kind, range }: { kind: PeriodKind; range: { start: number; end: number } }) {
  return (
    <pageData.Gate
      keys={["totals", "days", "started", "info"]}
      pulse={<PaneSkeleton />}
      error={(error) => <ReportErrorFallback error={error} />}
    >
      {({ totals, days, started, info }) => (
        <Body kind={kind} range={range} totals={totals} days={days} started={started} info={info} />
      )}
    </pageData.Gate>
  );
}

function Body({
  kind,
  range,
  totals,
  days,
  started,
  info,
}: {
  kind: PeriodKind;
  range: { start: number; end: number };
  totals: ReportTotals;
  days: PeriodDay[];
  started: boolean;
  info: Info;
}) {
  const [period, setPeriod] = usePeriod();
  const [, setTime] = useTime();
  const [, setView] = useView();

  const rangeLabel = labelOf(kind, range);
  // Memoised on its inputs because it is `useReportPdf`'s dependency: a fresh
  // object every render would re-render the PDF forever.
  const data = useMemo(
    () => toReportData({ kind, rangeLabel, totals, days, info }),
    [kind, rangeLabel, totals, days, info],
  );

  const { url, error } = useReportPdf(started ? data : null);
  const close = useMutation(() =>
    kind === "day"
      ? service.report.set.startDay(range.start, range.end)
      : service.report.set.close(kind, range.start, range.end),
  );

  const incomplete = totals.unclassified + totals.stale;
  const firstIncomplete = days.find((row) => row.unclassified > 0 || row.stale > 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-1 pb-2">
        <PeriodTabs period={period} setPeriod={setPeriod} />
        <div className="flex items-center gap-1.5">
          {started ? null : (
            <Button
              className="h-8"
              disabled={close.pending || incomplete > 0}
              onClick={() => void close.mutate(undefined)}
            >
              {CLOSE_LABEL[kind]}
            </Button>
          )}
          <Download kind="pdf" data={data} disabled={!started} />
          <Download kind="json" data={data} disabled={!started} />
        </div>
      </div>

      {incomplete > 0 ? (
        <div className="shrink-0 rounded-md border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {totals.unclassified > 0 ? (
            <p>{totals.unclassified} baris belum diklasifikasi.</p>
          ) : null}
          {totals.stale > 0 ? (
            <p>{totals.stale} baris rekamannya berubah setelah diklasifikasi.</p>
          ) : null}
          {firstIncomplete === undefined ? null : (
            <button
              type="button"
              className="mt-1 font-semibold underline"
              onClick={() => {
                setTime(firstIncomplete.day);
                setView("klasifikasi");
              }}
            >
              Lihat yang belum
            </button>
          )}
        </div>
      ) : null}

      {close.error === null ? null : (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {close.error.message}
        </p>
      )}

      <div className="min-h-0 flex-1">
        {!started ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-base font-semibold">Laporan belum dibuat</p>
            <p className="text-sm text-muted-foreground">
              {labelOf(kind, rangeOf(kind, range.start))}
            </p>
            {incomplete > 0 ? (
              <p className="text-sm text-muted-foreground">
                Selesaikan klasifikasinya dulu, lalu buat laporannya.
              </p>
            ) : null}
          </div>
        ) : error !== null ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-base font-semibold">PDF gagal disiapkan</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : url === null ? (
          <PaneSkeleton />
        ) : (
          // Dev caveat (REPORT.md §6): this box runs WebKitGTK, where an embedded
          // PDF is a blank box. The shipped build is WebView2, where it is not.
          <iframe src={url} title={`Laporan ${rangeLabel}`} className="h-full w-full rounded-md border" />
        )}
      </div>
    </div>
  );
}

function PeriodTabs({
  period,
  setPeriod,
}: {
  period: PeriodKind;
  setPeriod: (kind: PeriodKind) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
      {PERIOD_KINDS.map((kind) => (
        <Button
          key={kind}
          variant="ghost"
          className={cn(
            "h-8 rounded-md px-2.5 text-sm font-semibold transition-all",
            period === kind
              ? "bg-background text-primary shadow-sm hover:bg-background"
              : "text-muted-foreground hover:bg-transparent hover:text-foreground",
          )}
          onClick={() => setPeriod(kind)}
        >
          {TAB_LABEL[kind]}
        </Button>
      ))}
    </div>
  );
}

/**
 * One of the two downloads.
 *
 * The PDF is rendered again rather than taken from the viewer's blob URL: a
 * download must not depend on a preview having been drawn, and `renderReportPdf`
 * returns bytes so `saveBytes` can write them. Both go through Rust's Save dialog,
 * so this side never names a path.
 */
function Download({
  kind,
  data,
  disabled,
}: {
  kind: "pdf" | "json";
  data: Parameters<typeof toReportJson>[0];
  disabled: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setFailed(null);
    try {
      const name = `laporan-${data.range}`;
      const saved =
        kind === "pdf"
          ? await Effect.runPromise(
              Effect.flatMap(Effect.promise(() => renderReportPdf(data)), (bytes) =>
                saveBytes(name, "pdf", bytes),
              ),
            )
          : await Effect.runPromise(saveJson(name, toReportJson(data)));
      // `null` is a cancelled dialog, not a failure.
      if (saved === null) setFailed(null);
    } catch (cause) {
      setFailed(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        className="h-8 gap-1.5 px-2.5 text-sm"
        disabled={disabled || busy}
        onClick={() => void run()}
        title={failed ?? undefined}
      >
        {kind === "pdf" ? <FileDown className="size-4" /> : <FileJson className="size-4" />}
        {kind === "pdf" ? "PDF" : "JSON"}
      </Button>
      {failed === null ? null : (
        <span className="text-xs text-destructive" role="alert">
          gagal
        </span>
      )}
    </div>
  );
}
