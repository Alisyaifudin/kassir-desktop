import type { ReportPageError } from "./data";

/**
 * Panel-scoped failure. `ErrorComponent` is a full-page (`min-h-screen`) fallback,
 * which would blow up a two-pane layout — same reasoning as `Record/z-Error.tsx`,
 * whose sentence this is.
 */
export function ReportErrorFallback({ error }: { error: ReportPageError }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-base font-semibold">Laporan bermasalah</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
