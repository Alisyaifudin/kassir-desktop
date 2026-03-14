import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { DeleteBtn } from "./z-DeleteBtn";
import { memo } from "react";
import { MoneyData } from "./use-data";
import { formatDate, formatTime, getDayName } from "~/lib/date";

export const TableList = memo(function TableList({ money }: { money: MoneyData["saving"] }) {
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[55px] small:w-[40px]">No</TableHead>
          <TableHead className="text-center w-[120px] small:w-[70px]">Hari</TableHead>
          <TableHead className="text-center w-[290px] small:w-[200px]">Tanggal</TableHead>
          <TableHead className="text-center w-[140px] small:w-[100px]">Waktu</TableHead>
          <TableHead className="text-right w-[200px] small:w-[150px]">Nilai</TableHead>
          <TableHead className="text-center">Catatan</TableHead>
          <TableHead className="text-right w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {money.map((m, i) => (
          <TableRow key={m.timestamp}>
            <TableCell className="font-medium">{i + 1}</TableCell>
            <TableCell className="text-center">{getDayName(m.timestamp)}</TableCell>
            <TableCell className="text-center">{formatDate(m.timestamp, "long")}</TableCell>
            <TableCell className="text-center">{formatTime(m.timestamp, "long")}</TableCell>
            <TableCell className="text-right">Rp{m.value.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-center">{m.note}</TableCell>
            <TableCell>
              <DeleteBtn money={m} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
