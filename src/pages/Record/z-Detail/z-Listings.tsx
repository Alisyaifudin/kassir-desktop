import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import type { RecordFull } from "~/services/record";
import { ListingRow } from "./z-ListingRow";

/**
 * What was bought, one row per line, with each line's discounts indented beneath
 * it. A purchase (`outcoming`) also shows what the line cost.
 */
export function Listings({ record }: { record: RecordFull }) {
  // These tables sit in the page's one scroll container; the shared Table box
  // must not cap — and must not scroll — on its own. `overflow-visible` matters
  // as much as `max-h-none`: as a flex child, an `overflow-y-auto` box shrinks to
  // the leftover height and scrolls its rows internally, which puts a second
  // scrollbar inside the band and stops the sticky header from tracking the band.
  return (
    <Table className="text-base" parentClass="max-h-none overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">No</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-end w-[100px]">Satuan</TableHead>
          <Show when={record.mode === "outcoming"}>
            <TableHead className="text-end w-[100px]">Modal</TableHead>
          </Show>
          <TableHead className="text-end w-[50px]">Qty</TableHead>
          <TableHead className="text-end w-[100px]">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="border-b">
        <ForEach items={record.listings}>
          {(listing, index) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              index={index}
              record={record}
            />
          )}
        </ForEach>
      </TableBody>
    </Table>
  );
}
