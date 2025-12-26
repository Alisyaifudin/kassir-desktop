import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { capitalize, cn, formatTime } from "~/lib/utils";
import { ForEach } from "~/components/ForEach";
import { css } from "../style.css";
import { Record } from "../loader";
import { useParams, useSetParams } from "../use-params";
import { useSize } from "~/hooks/use-size";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { useCallback } from "react";

type ListProps = {
  records: Record[];
};

export function List({ records }: ListProps) {
  const size = useSize();
  const selected = useParams().selected;
  const setSelected = useSetParams().selected;
  const { order, sort } = useParams().order;
  const setOrder = useSetParams().order;
  const handleClickSort = useCallback(
    (o: "time" | "total") => {
      let s = sort;
      if (order === o) {
        s = s === "asc" ? "desc" : "asc";
      }
      setOrder(o, s);
    },
    [order, sort]
  );
  const sign = sort === "asc" ? 1 : -1;
  switch (order) {
    case "time":
      records.sort((a, b) => sign * (a.timestamp - b.timestamp));
      break;
    case "total":
      records.sort((a, b) => sign * (a.grandTotal - b.grandTotal));
      break;
  }
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className={css.recordGrid[size].no}>No</TableHead>
          <TableHead className={cn("text-center", css.recordGrid[size].cashier)}>Kasir</TableHead>
          <TableHead className={cn(css.recordGrid[size].time)}>
            <SortBtn
              onClick={() => handleClickSort("time")}
              sort={order === "time" ? sort : undefined}
              className="justify-center"
            >
              Waktu
            </SortBtn>
          </TableHead>
          <TableHead>
            <SortBtn
              onClick={() => handleClickSort("total")}
              sort={order === "total" ? sort : undefined}
              className="justify-end"
            >
              Total
            </SortBtn>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <ForEach items={records}>
          {(record, i) => (
            <TableRow
              onClick={() => setSelected(record.timestamp, selected)}
              className={cn(
                { "bg-sky-200 hover:bg-sky-100": selected === record.timestamp },
                { "bg-red-300": record.isCredit }
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
    </Table>
  );
}

function SortBtn({
  children,
  sort,
  onClick,
  className,
}: {
  children: string;
  sort?: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  if (sort === undefined)
    return (
      <button
        onClick={onClick}
        className={cn("p-0 w-full h-full flex items-center hover:shadow-md", className)}
      >
        {children}
      </button>
    );
  return (
    <button
      onClick={onClick}
      className="p-0 w-full h-full flex items-center justify-between hover:shadow-md"
    >
      {children}
      {sort === "desc" ? <ArrowDownWideNarrow /> : <ArrowDownNarrowWide />}
    </button>
  );
}
