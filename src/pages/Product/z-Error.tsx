import { ErrorComponent } from "~/components/ErrorComponent";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { ProductError } from "~/services/product";

export const ProductErrorBoundary = createErrorBoundary(ProductError);

export function ProductErrorFallback({ error }: { error: ProductError }) {
  return <ErrorComponent title="Produk bermasalah ☠">{error.message}</ErrorComponent>;
}
