import { createErrorBoundary } from "~/components/createErrorBoundary";
import { RecordError } from "~/services/record";

export const DebtErrorBoundary = createErrorBoundary(RecordError);

/** Panel-scoped: `ErrorComponent` is a full-page fallback and would blow up this pane. */
export function DebtErrorFallback({ error }: { error: RecordError }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-normal font-semibold">Utang bermasalah</p>
      <p className="text-small text-muted-foreground">{error.message}</p>
    </div>
  );
}
