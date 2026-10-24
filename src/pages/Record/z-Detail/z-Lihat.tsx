import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";

/**
 * The pane's way out to the record in full — the page that can correct what the
 * preview only reads.
 *
 * It sits in the identity band rather than in the shelf: the shelf now closes the
 * ledger at the end of a scroll, so a `Lihat` down there would mean scrolling a
 * long record to the bottom just to leave it. `url_back` carries the day and the
 * query the list was left on, so the full page's back button lands where the
 * record was picked.
 */
export function Lihat({ recordId }: { recordId: string }) {
  const { pathname, search } = useLocation();
  const back = encodeURIComponent(`${pathname}${search}`);

  return (
    <Button asChild className="shrink-0">
      <Link to={{ pathname: `/records/${recordId}`, search: `?url_back=${back}` }}>Lihat</Link>
    </Button>
  );
}
