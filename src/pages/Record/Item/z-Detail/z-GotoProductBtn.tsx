import { Pencil } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

/** A linked line goes back to its product, not to an arbitrary listing. */
export const GotoProductBtn = memo(function GotoProductBtn({
  productId,
  recordId,
}: {
  recordId: string;
  productId?: string;
}) {
  const backURL = useGenerateUrlBack(`/records/${recordId}`);
  return (
    <Show value={productId}>
      {(id) => (
        <>
          <Button asChild className="p-0" variant="link">
            <Link
              to={{
                pathname: `/products/${id}`,
                search: `?url_back=${encodeURIComponent(backURL)}`,
              }}
              aria-label="Buka produk"
            >
              <Pencil className="icon" />
            </Link>
          </Button>
          <div className="flex-1" />
        </>
      )}
    </Show>
  );
});
