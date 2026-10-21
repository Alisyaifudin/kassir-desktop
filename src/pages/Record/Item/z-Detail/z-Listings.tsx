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
  // must not cap and scroll on its own, so it sizes to its content instead.
  return (
    <Table className="text-normal" parentClass="max-h-none">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[93px] small:w-[80px]">No</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-end w-[170px] small:w-[100px]">Satuan</TableHead>
          <Show when={record.mode === "outcoming"}>
            <TableHead className="text-end w-[170px] small:w-[100px]">Modal</TableHead>
          </Show>
          <TableHead className="text-end w-[57px] small:w-[40px]">Qty</TableHead>
          <TableHead className="text-end w-[170px] small:w-[100px]">Total</TableHead>
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
