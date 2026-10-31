import { Link, useLocation } from "~/services/route/react";
import { Button } from "~/components/ui/button";

/**
 * The pane's way out to the record in full — the page that can correct what the
 * preview only reads.
 *
 * It sits in the identity band rather than in the shelf: the shelf now closes the
 * ledger at the end of a scroll, so a `Lihat` down there would mean scrolling a
 * long record to the bottom just to leave it. This is a new screen — the record in
 * full, which is where it can be corrected — so the stack takes an entry for it and
 * `Back` returns to the pane it was opened from, on the day and query it was left
 * on. `url_back` is kept on the link for one release: it costs nothing and a
 * screen reached from outside the app still has no history behind it.
 */
export function Lihat({ recordId }: { recordId: string }) {
  const { pathname, search } = useLocation();
  const back = encodeURIComponent(`${pathname}${search}`);

  return (
    <Button asChild className="shrink-0">
      <Link
        behavior="push"
        to={{ pathname: `/records/${recordId}`, search: `?url_back=${back}` }}
      >
        Lihat
      </Link>
    </Button>
  );
}
