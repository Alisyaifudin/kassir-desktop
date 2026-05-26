import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { capitalize, cn } from "~/lib/utils";
import { ForEach } from "~/components/ForEach";
import { Record } from "../use-records";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { useCallback } from "react";
import { formatTime } from "~/lib/date";
import { useSelected } from "../use-selected";
import { useOrder } from "../use-order";

type ListProps = {
  records: Record[];
};

export function List({ records }: ListProps) {
  const [selected, setSelected] = useSelected();
  const [{ order, sort }, setOrder] = useOrder();
  const handleClickSort = useCallback(
    (o: "time" | "total") => {
      let s = sort;
      if (order === o) {
        s = s === "asc" ? "desc" : "asc";
      }
      setOrder(o, s);
    },
    [order, sort, setOrder],
  );
  const sign = sort === "asc" ? 1 : -1;
  switch (order) {
    case "time":
      records.sort((a, b) => sign * (a.paidAt - b.paidAt));
      break;
    case "total":
      records.sort((a, b) => sign * (a.grandTotal - b.grandTotal));
      break;
  }
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30px] small:w-[10px]">No</TableHead>
          <TableHead className={cn("text-center w-[150px] small:w-[90px]")}>Kasir</TableHead>
          <TableHead className="w-[120px] small:w-[93px]">
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
              onClick={() => setSelected(record.id)}
              className={cn(
                { "bg-sky-200 hover:bg-sky-100": selected === record.id },
                { "bg-red-300": record.isCredit },
              )}
            >
              <TableCell>{i + 1}</TableCell>
              <TableCell className="text-center">{capitalize(record.cashier)}</TableCell>
              <TableCell className="text-center">{formatTime(record.paidAt)}</TableCell>
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
