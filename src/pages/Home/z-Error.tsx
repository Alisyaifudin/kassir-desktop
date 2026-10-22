import { AlertCircle } from "lucide-react";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { MoneyError } from "~/services/money";
import { RecordError } from "~/services/record";

export const DayErrorBoundary = createErrorBoundary(RecordError);
export const PocketsErrorBoundary = createErrorBoundary(MoneyError);

/**
 * One line of failure inside the region that failed, not a page-wide takeover:
 * the pockets are a different service, and losing them must not hide the day.
 */
export function RegionError({ title, error }: { title: string; error: { message: string } }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-card px-4 py-3"
    >
      <AlertCircle
        aria-hidden="true"
        className="mt-1 size-5 shrink-0 text-destructive small:size-4"
      />
      <div className="flex min-w-0 flex-col">
        <p className="font-medium text-destructive">{title}</p>
        <p className="text-small text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

export function DayError({ error }: { error: RecordError }) {
  return <RegionError title="Gagal memuat ringkasan hari ini" error={error} />;
}

export function PocketsError({ error }: { error: MoneyError }) {
  return <RegionError title="Gagal memuat uang" error={error} />;
}
