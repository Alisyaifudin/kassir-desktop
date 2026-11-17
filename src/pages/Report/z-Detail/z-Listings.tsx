import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { discountLabel, discountTotals } from "~/lib/record-discounts";
import { roundToFix } from "~/services/record/round";
import type { RecordFull } from "~/services/record";
import type { LineClassification } from "~/services/report";
import type { Categories } from "./data";
import { KategoriCell } from "./z-KategoriCell";

/**
 * The record's goods, one row per line, with the `Kategori` column the whole
 * screen exists for.
 *
 * The money columns are the record page's (`Record/z-Detail/z-Listings` reduced to
 * what classification needs — the unit price and the cost stay there), and a
 * line's discounts are drawn beneath it by the same helpers the receipt uses, so
 * a line that is cheaper than it looks explains itself here too.
 *
 * A discount is *part of its line*: it has no category of its own, and the row is
 * indented to say so. Categorising it separately would let a report count a
 * discount twice — once inside the line's total and once beside it.
 */
export function KategoriListings({
  record,
  byLine,
  categories,
}: {
  record: RecordFull;
  byLine: Map<string, LineClassification>;
  categories: Categories;
}) {
  return (
    <Table className="text-base" parentClass="max-h-none overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">No</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="w-[100px] text-end">Total</TableHead>
          <TableHead className="w-[168px] text-end">Kategori</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="border-b">
        <ForEach items={record.listings}>
          {(listing, index) => {
            const totals = discountTotals(listing.price, listing.qty, listing.discounts);
            return (
              <>
                <TableRow key={listing.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{listing.name}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {roundToFix(listing.price * listing.qty, record.fix).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <KategoriCell
                        recordId={record.id}
                        source="listing"
                        lineId={listing.id}
                        category={byLine.get(listing.id)}
                        categories={categories}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                <Show when={listing.discounts.length > 0}>
                  <ForEach items={listing.discounts}>
                    {(discount, discountIndex) => (
                      <TableRow key={`${listing.id}-${discount.id}`}>
                        <TableCell />
                        <TableCell className="pl-4 text-sm text-muted-foreground">
                          {discountLabel(discount)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-sm text-muted-foreground">
                          {roundToFix(totals[discountIndex] ?? 0, record.fix).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </ForEach>
                </Show>
              </>
            );
          }}
        </ForEach>
      </TableBody>
    </Table>
  );
}
