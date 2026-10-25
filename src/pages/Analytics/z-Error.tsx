import { AlertCircle } from "lucide-react";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { AnalyticsError } from "~/services/analytics";

export const AnalyticsErrorBoundary = createErrorBoundary(AnalyticsError);

export function AnalyticsErrorFallback({ error }: { error: AnalyticsError }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-card p-3"
    >
      <AlertCircle
        aria-hidden="true"
        className="mt-1 size-5 shrink-0 text-destructive small:size-4"
      />
      <div className="flex min-w-0 flex-col">
        <p className="font-medium text-destructive">Gagal memuat analisis</p>
        <p className="text-small text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}
