import { createErrorBoundary, createManyErrorBoundary } from "~/components/createErrorBoundary";
import { TextError } from "~/components/TextError";
import { InfoError } from "~/services/info";
import { MethodError } from "~/services/method";
import { ProductError } from "~/services/product";
import { RecordError } from "~/services/record";
import { SocialError } from "~/services/social";

/**
 * Panel-scoped boundaries. `ErrorComponent` is a full-page fallback, which would
 * blow up this layout, so a failure is contained to the panel that raised it.
 */
export const ItemErrorBoundary = createErrorBoundary(RecordError);

export function ItemErrorFallback({ error }: { error: RecordError }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-normal font-semibold">Catatan bermasalah</p>
      <p className="text-small text-muted-foreground">{error.message}</p>
    </div>
  );
}

export const ReceiptErrorBoundary = createManyErrorBoundary(InfoError, SocialError);

export const MethodErrorBoundary = createErrorBoundary(MethodError);

export const ProductErrorBoundary = createErrorBoundary(ProductError);

/** The one-liner these narrow panels have room for. */
export function InlineError({
  error,
}: {
  error: InfoError | SocialError | MethodError | ProductError;
}) {
  return <TextError>{error.message}</TextError>;
}
