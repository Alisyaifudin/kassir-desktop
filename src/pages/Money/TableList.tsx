import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDate, formatTime, getDayName } from "~/lib/utils";
import { DeleteBtn } from "./DeleteBtn";
import { memo } from "react";
import { MoneyData } from "./loader";
import { useSize } from "~/hooks/use-size";
import { style } from "./style";

export const TableList = memo(function ({ money }: { money: MoneyData["saving"] }) {
  const size = useSize();
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead style={style[size].no}>No</TableHead>
          <TableHead style={style[size].day} className="text-center">
            Hari
          </TableHead>
          <TableHead style={style[size].date} className="text-center">
            Tanggal
          </TableHead>
          <TableHead style={style[size].time} className="text-center">
            Waktu
          </TableHead>
          <TableHead className="text-right">Nilai</TableHead>
          <TableHead style={style[size].last} className="text-right"></TableHead>
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
            <TableCell>
              <DeleteBtn money={m} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
