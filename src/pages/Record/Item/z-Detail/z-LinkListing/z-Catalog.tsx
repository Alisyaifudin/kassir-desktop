import { Loader, useStream } from "~/components/Loader";
import { ProductErrorBoundary, InlineError } from "../../z-Error";
import type { RecordListing } from "~/services/record";
import { service } from "~/services";
import { Picker } from "./z-Picker";

/** The full catalog is only read when its dialog opens, not once per table row. */
export function Catalog({ listing }: { listing: RecordListing }) {
  const products = useStream(service.product.get.changes);
  return (
    <ProductErrorBoundary fallback={InlineError}>
      <Loader res={products} fallback={<span className="inline-block size-5" />}>
        {({ data }) => <Picker listing={listing} products={data} />}
      </Loader>
    </ProductErrorBoundary>
  );
}
