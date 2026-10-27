import { RecordError } from "~/services/record";

/** Panel-scoped: `ErrorComponent` is a full-page fallback and would blow up this pane. */
export function DebtErrorFallback({ error }: { error: RecordError }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-base font-semibold">Utang bermasalah</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
