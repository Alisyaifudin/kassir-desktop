import { Table, TableBody, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { useUser } from "~/hooks/use-user";
import { cn } from "~/lib/utils";
import type { RecordFull } from "~/services/record";
import { ListingRow } from "./z-ListingRow";

/**
 * What was bought, one row per line, with each line's discounts indented beneath
 * it. A purchase (`outcoming`) also shows what the line cost.
 *
 * A sale carries a cost too — the one it inherited from the stock lot it drew
 * from — and that is the figure every margin is computed from. It stays hidden
 * from a cashier (the price they typed is the price above it), and shows for an
 * admin, who is the one expected to notice when it is nonsense.
 *
 * `editableCapital` is passed by the record's own page and not by the pane that
 * previews it: the pane corrects nothing.
 */
export function Listings({
  record,
  editableCapital = false,
}: {
  record: RecordFull;
  editableCapital?: boolean;
}) {
  const user = useUser();
  const showCapital = record.mode === "outcoming" || user.role === "admin";
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
          <Show when={showCapital}>
            <TableHead className={cn("text-end", editableCapital ? "w-[150px]" : "w-[100px]")}>
              Modal
            </TableHead>
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
              showCapital={showCapital}
              editableCapital={editableCapital}
            />
          )}
        </ForEach>
      </TableBody>
    </Table>
  );
}
