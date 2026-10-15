import { Show } from "~/components/Show";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { roundToFix } from "~/services/record/round";
import type { RecordFull, RecordListing } from "~/services/record";
import { discountLabel, discountTotals } from "./discounts";
import { GotoProductBtn } from "./z-GotoProductBtn";
import { LinkListing } from "./z-LinkListing";

export function ListingRow({
  listing,
  index,
  record,
  canLink,
}: {
  listing: RecordListing;
  index: number;
  record: RecordFull;
  canLink: boolean;
}) {
  const isPurchase = record.mode === "outcoming";
  const totals = discountTotals(listing.price, listing.qty, listing.discounts);
  return (
    <>
      <TableRow>
        <TableCell className="flex items-center">
          {index + 1}
          {canLink ? <LinkListing listing={listing} /> : null}
        </TableCell>
        <TableCell>{listing.name}</TableCell>
        <TableCell className="text-end">
          <span className="flex items-center gap-1 justify-end">
            <GotoProductBtn recordId={record.id} productId={listing.productId ?? undefined} />
            {roundToFix(listing.price, record.fix).toLocaleString("id-ID")}
          </span>
        </TableCell>
        <Show when={isPurchase}>
          <TableCell className="text-end">
            {roundToFix(listing.capital, record.fix).toLocaleString("id-ID")}
          </TableCell>
        </Show>
        <TableCell className="text-end">{listing.qty}</TableCell>
        <TableCell className={cn("text-end", { italic: listing.discounts.length > 0 })}>
          {roundToFix(listing.price * listing.qty, record.fix).toLocaleString("id-ID")}
        </TableCell>
      </TableRow>
      {listing.discounts.map((discount, discountIndex) => (
        <TableRow key={discount.id}>
          <TableCell colSpan={isPurchase ? 3 : 2} className="text-end">
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
