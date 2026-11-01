import { Link } from "~/services/route/react";
import { Button } from "~/components/ui/button";

/**
 * The pane's way out to the record in full — the page that can correct what the
 * preview only reads.
 *
 * It sits in the identity band rather than in the shelf: the shelf now closes the
 * ledger at the end of a scroll, so a `Lihat` down there would mean scrolling a
 * long record to the bottom just to leave it. This is a new screen — the record in
 * full — so the stack takes an entry for it, and `Back` returns to the pane it was
 * opened from, on the day and the query it was left on.
 */
export function Lihat({ recordId }: { recordId: string }) {
  return (
    <Button asChild className="shrink-0">
      <Link to={`/records/${recordId}`} behavior="push">
        Lihat
      </Link>
    </Button>
  );
}
