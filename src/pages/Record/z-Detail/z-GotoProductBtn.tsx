import { Pencil } from "lucide-react";
import { memo } from "react";
import { Link } from "~/services/route/react";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";

/**
 * A linked line goes back to its product, not to an arbitrary listing.
 *
 * This used to be the hard part of the screen: the product's way back had to be
 * named here, and naming `/records/:id` undid the step the operator took to get
 * here, so the URL had to be the *records list* — the one this record was opened
 * from, recovered from its own `url_back`, with `/records` as the answer for a
 * record reached by a bare deep link.
 *
 * None of that is this component's business any more. The product is a step, so it
 * is pushed: `Back` returns to this record, and `Back` again to the list it was
 * read on — as many hops as the operator actually took, because the stack kept
 * them.
 */
export const GotoProductBtn = memo(function GotoProductBtn({ productId }: { productId?: string }) {
  return (
    <Show value={productId}>
      {(id) => (
        <>
          <Button asChild className="p-0" variant="link">
            <Link to={`/products/${id}`} behavior="push" aria-label="Buka produk">
              <Pencil className="size-5" />
            </Link>
          </Button>
          <div className="flex-1" />
        </>
      )}
    </Show>
  );
});
