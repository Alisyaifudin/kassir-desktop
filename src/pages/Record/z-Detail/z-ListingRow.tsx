import { Show } from "~/components/Show";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { roundToFix } from "~/services/record/round";
import type { RecordFull, RecordListing } from "~/services/record";
import { discountLabel, discountTotals } from "./discounts";
import { GotoProductBtn } from "./z-GotoProductBtn";
import { LineCapital } from "./z-LineCapital";

export function ListingRow({
  listing,
  index,
  record,
  showCapital,
  editableCapital,
}: {
  listing: RecordListing;
  index: number;
  record: RecordFull;
  /** The cost column is read on a purchase, and by an admin on a sale. */
  showCapital: boolean;
  /** The escape hatch for a wrong `modal`; the item page alone offers it. */
  editableCapital: boolean;
}) {
  const totals = discountTotals(listing.price, listing.qty, listing.discounts);
  return (
    <>
      <TableRow>
        <TableCell>{index + 1}</TableCell>
        <TableCell>{listing.name}</TableCell>
        <TableCell className="text-end">
          <span className="flex items-center gap-1 justify-end">
            <GotoProductBtn productId={listing.productId ?? undefined} />
            {roundToFix(listing.price, record.fix).toLocaleString("id-ID")}
          </span>
        </TableCell>
        <Show when={showCapital}>
          <TableCell className="text-end">
            <span className="flex items-center justify-end gap-1">
              {roundToFix(listing.capital, record.fix).toLocaleString("id-ID")}
              {editableCapital ? <LineCapital record={record} listing={listing} /> : null}
            </span>
          </TableCell>
        </Show>
        <TableCell className="text-end">{listing.qty}</TableCell>
        <TableCell className={cn("text-end", { italic: listing.discounts.length > 0 })}>
          {roundToFix(listing.price * listing.qty, record.fix).toLocaleString("id-ID")}
        </TableCell>
      </TableRow>
      {listing.discounts.map((discount, discountIndex) => (
        <TableRow key={discount.id}>
          <TableCell colSpan={showCapital ? 3 : 2} className="text-end">
            {discountLabel(discount)}
          </TableCell>
          <TableCell colSpan={2} className="text-end">
            {roundToFix(discount.eff, record.fix).toLocaleString("id-ID")}
          </TableCell>
          <TableCell className="text-end">
            {roundToFix(totals[discountIndex], record.fix).toLocaleString("id-ID")}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
