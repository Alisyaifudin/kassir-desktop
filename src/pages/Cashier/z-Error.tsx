import { TextError } from "~/components/TextError";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { CashierError } from "~/services/cashier";

export const CashierErrorBoundary = createErrorBoundary(CashierError);

/**
 * Renders where the cashier list sits, so the fallback is that one line rather
 * than the full-page `ErrorComponent` the legacy page dropped in.
 */
export function CashierErrorFallback({ error }: { error: CashierError }) {
  return <TextError>{`Daftar kasir bermasalah: ${error.message}`}</TextError>;
}
