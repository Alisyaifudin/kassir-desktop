import { Pencil } from "lucide-react";
import { memo } from "react";
import { Link, useLocation } from "react-router";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { urlBackOf } from "~/lib/utils";

/**
 * A linked line goes back to its product, not to an arbitrary listing — and the
 * product's way back is the *records list*, never the record this line was read
 * in. Naming `/records/:id` there undid the step the operator took to get here:
 * `Back` from the product landed on the record they had just left, so the way out
 * of the product was a detour that returned to the detour.
 *
 * The list URL is the one this screen already knows. A record opened from
 * somewhere carries that somewhere as its `url_back` — the day's list with its
 * filters, the comprehensive search — so that is what the product inherits. The
 * pane that previews a record on `/records` itself has no `url_back` to hand on:
 * the listing *is* the screen, so it says so, selection and all. A record reached
 * by a bare deep link or bookmark has neither and names `/records` plainly.
 */
export const GotoProductBtn = memo(function GotoProductBtn({
  productId,
}: {
  productId?: string;
}) {
  const { pathname, search } = useLocation();
  const backURL =
    urlBackOf(new URLSearchParams(search)) ??
    (pathname === "/records" ? `${pathname}${search}` : "/records");

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
              <Pencil className="size-5" />
            </Link>
          </Button>
          <div className="flex-1" />
        </>
      )}
    </Show>
  );
});
