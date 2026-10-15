import { PrinterError } from "~/services/printer";
import { createManyErrorBoundary } from "~/components/createErrorBoundary";
import { InvokeError } from "~/lib/effect-error";
import { TextError } from "~/components/TextError";

/** Panel-scoped: a printer that cannot be read should not take the page down. */
export const PrinterErrorBoundary = createManyErrorBoundary(PrinterError, InvokeError);

export function PrinterErrorFallback({ error }: { error: PrinterError | InvokeError }) {
  return <TextError>{error.message}</TextError>;
}
