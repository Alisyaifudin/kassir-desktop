import { SaveError } from "~/components/SaveError";
import { SyncPill } from "~/components/sync/z-Pill";

/**
 * The bottom-left corner of the app shell.
 *
 * Two things live here and they used to collide: `SaveError` — a cart write that
 * failed, fixed to the corner since the POS was written — and the sync status
 * pill. Two independently `fixed` elements at `bottom-4 left-4` overlap, and the
 * overlap is between a banner that can be two lines and a pill, so give them one
 * container and let the layout stack them bottom-up: the pill stays in the corner
 * (it is the thing you glance at) and the banner grows above it.
 *
 * The container is not interactive; each child sets `pointer-events-auto` if it
 * is. That keeps the empty corner click-through on every screen.
 */
export function BottomRail() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      <SaveError />
      <SyncPill />
    </div>
  );
}
