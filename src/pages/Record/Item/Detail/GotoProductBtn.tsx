import { Pencil } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";

export const GotoProductBtn = memo(function ({ productId }: { productId?: number }) {
  const backURL = encodeURIComponent(window.location.pathname + window.location.search);
  return (
    <Show value={productId}>
      {(productId) => (
        <>
          <Button asChild className="p-0" variant="link">
            <Link to={{ pathname: `/stock/product/${productId}`, search: `?url_back=${backURL}` }}>
              <Pencil className="icon" />
            </Link>
          </Button>
          <div className="flex-1" />
        </>
      )}
    </Show>
  );
});
