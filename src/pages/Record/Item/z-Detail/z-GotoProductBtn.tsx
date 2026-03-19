import { Pencil } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export const GotoProductBtn = memo(function GotoProductBtn({
  productId,
  timestamp,
}: {
  timestamp: number;
  productId?: number;
}) {
  const backURL = useGenerateUrlBack(`/records/${timestamp}`);
  return (
    <Show value={productId}>
      {(productId) => (
        <>
          <Button asChild className="p-0" variant="link">
            <Link
              to={{
                pathname: `/stock/product/${productId}`,
                search: `?url_back=${encodeURI(backURL)}`,
              }}
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
