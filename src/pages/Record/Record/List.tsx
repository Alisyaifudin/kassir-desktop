import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollable,
} from "~/components/ui/table";
import { capitalize, cn, formatTime } from "~/lib/utils";
import { RecordTransform } from "~/lib/record";
import { ForEach } from "~/components/ForEach";
import { getParam, setParam } from "../utils/params";
import { useSearchParams } from "react-router";
import { Size } from "~/lib/store-old";
import { css } from "../style.css";

type ListProps = {
  records: RecordTransform[];
  size: Size;
};

export function List({ records, size }: ListProps) {
  const [search, setSearch] = useSearchParams();
  const selected = getParam(search).selected;
  const setSelected = (clicked: number) => setParam(setSearch).selected(clicked, selected);
  return (
    <TableScrollable className="text-normal" parentClass="flex-1 overflow-auto">
      <TableHeader>
        <TableRow>
          <TableHead className={css.recordGrid[size].no}>No</TableHead>
          <TableHead className={cn("text-center", css.recordGrid[size].cashier)}>Kasir</TableHead>
          <TableHead className={cn("text-center", css.recordGrid[size].cashier)}>Waktu</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <ForEach items={records}>
          {(record, i) => (
            <TableRow
              onClick={() => setSelected(record.timestamp)}
              className={cn(
                { "bg-sky-200 hover:bg-sky-100": selected === record.timestamp },
                { "bg-red-300": record.credit === 1 },
              )}
            >
              <TableCell>{i + 1}</TableCell>
              <TableCell className="text-center">{capitalize(record.cashier)}</TableCell>
              <TableCell className="text-center">{formatTime(record.timestamp)}</TableCell>
              <TableCell className="text-right">
                {record.grandTotal.toLocaleString("id-ID")}
              </TableCell>
            </TableRow>
          )}
        </ForEach>
      </TableBody>
    </TableScrollable>
  );
}
