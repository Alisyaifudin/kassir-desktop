import { Show } from "~/components/Show";
import type { RecordFull } from "~/services/record";
import { ExtrasTable } from "../../z-Detail/ExtrasTable";
import { Footer as Settlement } from "../../z-Detail/Footer";
import { Actions } from "./z-Actions";
import { Listings } from "./z-Listings";
import { Meta } from "./z-Meta";

/** The full ledger view, plus the small actions that belong to this record. */
export function Detail({ record }: { record: RecordFull }) {
  // One scroll container lives above us (the tab pane). The tables inside must
  // not box their own scrollbars on top of it, so they size to their content.
  return (
    <div className="flex flex-col gap-4 pr-2">
      <Listings record={record} />
      <Show when={record.extras.length > 0}>
        <ExtrasTable record={record} parentClass="max-h-none" />
      </Show>
      <Settlement record={record} />
      <Actions record={record} />
      <Meta record={record} />
    </div>
  );
}
