import { createErrorBoundary } from "~/components/createErrorBoundary";
import { MethodError } from "~/services/method";
import { RecordError } from "~/services/record";

/**
 * Panel-scoped boundaries. `ErrorComponent` is a full-page (`min-h-screen`)
 * fallback, which would blow up a two-pane layout, so these render inside the
 * pane that actually failed.
 */
export const RecordsErrorBoundary = createErrorBoundary(RecordError);

export function RecordsErrorFallback({ error }: { error: RecordError }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-normal font-semibold">Riwayat bermasalah</p>
      <p className="text-small text-muted-foreground">{error.message}</p>
    </div>
  );
}

export const MethodErrorBoundary = createErrorBoundary(MethodError);

export function MethodErrorFallback({ error }: { error: MethodError }) {
  return <p className="text-small text-destructive">{error.message}</p>;
}
