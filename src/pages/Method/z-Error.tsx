import { TextError } from "~/components/TextError";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { MethodError } from "~/services/method";

export const MethodErrorBoundary = createErrorBoundary(MethodError);

/**
 * Renders where the method list sits, so the fallback is that one line rather
 * than the full-page `ErrorComponent` the legacy page dropped in.
 */
export function MethodErrorFallback({ error }: { error: MethodError }) {
  return <TextError>{`Metode pembayaran bermasalah: ${error.message}`}</TextError>;
}
