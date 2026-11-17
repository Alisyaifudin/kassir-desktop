import { ForEach } from "~/components/ForEach";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { extraAmount, extrasRunningTotals, rupiah } from "~/lib/record-money";
import type { RecordFull } from "~/services/record";
import type { LineClassification } from "~/services/report";
import type { Categories } from "./data";
import { KategoriCell } from "./z-KategoriCell";

/**
 * The record's charges, in the record page's own layout: the subtotal opens as an
 * unnumbered base row and each extra carries the running total it produces, so the
 * column lands on the record's total.
 *
 * This is the table that needs a human. Incoming goods default to Jual and
 * outgoing goods to Beli, but a charge is whatever the shop decided to call it —
 * `Ongkir` is the classic case, where the money was charged *and* paid out
 * separately (see REPORT.md §7) — so `KategoriCell` is the row's real content.
 *
 * The subtotal row has no category because it is the goods, already classified
 * line by line above.
 */
export function KategoriExtras({
  record,
  byLine,
  categories,
}: {
  record: RecordFull;
  byLine: Map<string, LineClassification>;
  categories: Categories;
}) {
  const running = extrasRunningTotals(record);

  return (
    <Table className="text-base" parentClass="max-h-none overflow-visible">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px] font-normal">No</TableHead>
          <TableHead className="font-normal">Nama</TableHead>
          <TableHead className="w-[170px] text-end font-normal">Nilai</TableHead>
          <TableHead className="w-[110px] text-end font-normal">Total</TableHead>
          <TableHead className="w-[168px] text-end font-normal">Kategori</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="border-b">
        <TableRow>
          <TableCell />
          <TableCell className="text-muted-foreground">Subtotal</TableCell>
          <TableCell />
          <TableCell className="text-end tabular-nums">
            {rupiah(record.subTotal, record.fix)}
          </TableCell>
          <TableCell />
        </TableRow>
        <ForEach items={record.extras}>
          {(extra, index) => (
            <TableRow key={extra.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{extra.name}</TableCell>
              <TableCell className="text-end tabular-nums">
                {extraAmount(extra, record.fix)}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {rupiah(running[index] ?? record.total, record.fix)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <KategoriCell
                    recordId={record.id}
                    source="extra"
                    lineId={extra.id}
                    category={byLine.get(extra.id)}
                    categories={categories}
                  />
                </div>
              </TableCell>
            </TableRow>
          )}
        </ForEach>
      </TableBody>
    </Table>
  );
}
