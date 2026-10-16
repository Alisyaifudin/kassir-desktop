import { ErrorComponent } from "~/components/ErrorComponent";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { MoneyError } from "~/services/money";

export const MoneyErrorBoundary = createErrorBoundary(MoneyError);

export function MoneyErrorFallback({ error }: { error: MoneyError }) {
  return <ErrorComponent title="Catatan keuangan bermasalah ☠">{error.message}</ErrorComponent>;
}
