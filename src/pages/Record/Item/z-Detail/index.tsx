import { Show } from "~/components/Show";
import type { RecordFull } from "~/services/record";
import { ExtrasTable } from "../../z-Detail/ExtrasTable";
import { Identity } from "./z-Identity";
import { Listings } from "./z-Listings";
import { Parties } from "./z-Parties";
import { Shelf } from "./z-Shelf";

/**
 * One record, read as a ledger: what it is on top, the goods in the middle, the
 * settlement and its corrections pinned at the bottom. The middle band is the
 * page's only scroll container, because it is the only part whose length varies
 * from record to record.
 */
export function Detail({ record }: { record: RecordFull }) {
  const empty = record.listings.length === 0 && record.extras.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Identity record={record} />
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
      </div>
      <Shelf record={record} />
    </div>
  );
}
