import { ForEach } from "~/components/ForEach";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { RecordFull } from "~/services/record";
import { extraAmount, extrasRunningTotals, rupiah } from "./extras";

/**
 * Extras as their own table, mirroring the listings above it. The subtotal opens
 * as an unnumbered base row and each extra carries the running total it produces
 * in the last column, so the column ends on the record's total.
 */
export function ExtrasTable({ record }: { record: RecordFull }) {
  const running = extrasRunningTotals(record);

  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[57px] font-normal small:w-[41px]">No</TableHead>
          <TableHead className="font-normal">Nama</TableHead>
          <TableHead className={cn("text-end w-[340px] font-normal small:w-[300px]")}>
            Nilai
          </TableHead>
          <TableHead className={cn("text-end w-[250px] font-normal small:w-[220px]")}>
            Total
          </TableHead>
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
        </TableRow>
        <ForEach items={record.extras}>
          {(extra, index) => (
            <TableRow>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{extra.name}</TableCell>
              <TableCell className="text-end tabular-nums">
                {extraAmount(extra, record.fix)}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {rupiah(running[index] ?? record.subTotal, record.fix)}
              </TableCell>
            </TableRow>
          )}
        </ForEach>
      </TableBody>
    </Table>
  );
}
