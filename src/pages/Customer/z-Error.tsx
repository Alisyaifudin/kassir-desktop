import { TextError } from "~/components/TextError";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { CustomerError } from "~/services/customer";

export const CustomerErrorBoundary = createErrorBoundary(CustomerError);

/**
 * Renders where the customer list sits, so the fallback is that one line rather
 * than the full-page `ErrorComponent` the legacy page dropped in.
 */
export function CustomerErrorFallback({ error }: { error: CustomerError }) {
  return <TextError>{`Daftar pelanggan bermasalah: ${error.message}`}</TextError>;
}
