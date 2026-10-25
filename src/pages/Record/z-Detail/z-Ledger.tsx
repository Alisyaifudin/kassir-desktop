import type { ReactNode } from "react";
import { Show } from "~/components/Show";
import type { RecordFull } from "~/services/record";
import { ExtrasTable } from "./ExtrasTable";
import { Listings } from "./z-Listings";
import { Parties } from "./z-Parties";

/**
 * The ledger, read the same way by both faces of a record: the identity band on
 * top, then one scroll holding the goods, the charges, the parties, and the band
 * that closes the record.
 *
 * The shelf is a slot rather than part of this body because the two faces answer
 * different questions in it — the page says "who fixes it", the pane says "where
 * next" — but *where* it sits is not a choice either face gets to make. Pinned
 * over a long ledger it covered the rows underneath and read as a separate screen
 * from the goods it priced, which is the drift this component exists to prevent.
 *
 * The identity band is a slot for the same reason: the page fills its second line
 * with the two date corrections, the pane puts its close button on the first.
 */
export function Ledger({
  record,
  identity,
  shelf,
}: {
  record: RecordFull;
  /** `<Identity>` for this face: the page's corrections, the pane's close. */
  identity: ReactNode;
  /** The band that closes the ledger, in the same scroll. */
  shelf: ReactNode;
}) {
  const empty = record.listings.length === 0 && record.extras.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {identity}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1 pr-2">
        {empty ? (
          <p className="px-1 text-small text-muted-foreground">
            Catatan ini tidak punya barang maupun biaya.
          </p>
        ) : null}
        <Show when={record.listings.length > 0}>
          <Listings record={record} />
        </Show>
        <Show when={record.extras.length > 0}>
          <ExtrasTable record={record} parentClass="max-h-none overflow-visible" />
        </Show>
        <Parties record={record} />
        {shelf}
      </div>
    </div>
  );
}
