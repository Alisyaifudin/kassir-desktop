import { useCallback, useMemo } from "react";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ForEach } from "~/components/ForEach";
import { capitalize, cn } from "~/lib/utils";
import { formatTime } from "~/lib/date";
import type { Record as RecordModel } from "~/services/record";
import { useSelected } from "../use-selected";
import { useOrder } from "../use-order";

export function List({ records }: { records: RecordModel[] }) {
  const [selected, setSelected] = useSelected();
  const [{ order, sort }, setOrder] = useOrder();

  const handleClickSort = useCallback(
    (next: "time" | "total") => {
      const direction = order === next ? (sort === "asc" ? "desc" : "asc") : sort;
      setOrder(next, direction);
    },
    [order, sort, setOrder],
  );

  // Copy before sorting: `records` is a prop, and sorting it in place would
  // mutate the parent's array during render.
  const sorted = useMemo(() => {
    const sign = sort === "asc" ? 1 : -1;
    return [...records].sort((a, b) =>
      order === "time" ? sign * (a.paidAt - b.paidAt) : sign * (a.grandTotal - b.grandTotal),
    );
  }, [records, order, sort]);

  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30px] font-normal small:w-[10px]">No</TableHead>
          <TableHead className={cn("text-center w-[150px] font-normal small:w-[90px]")}>
            Kasir
          </TableHead>
          <TableHead className="w-[120px] font-normal small:w-[93px]">
            <SortBtn
              onClick={() => handleClickSort("time")}
              sort={order === "time" ? sort : undefined}
              className="justify-center"
            >
              Waktu
            </SortBtn>
          </TableHead>
          <TableHead className="font-normal">
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
      {/* Rows sit at the header's muted colour and one weight below it, so the
          list doesn't out-shout its own column labels. Needs the shipped
          variable face — the OS build of Noto Sans has no 300. The tinted
          (selected / credit) rows keep full contrast against their background. */}
      <TableBody className="text-muted-foreground font-light">
        <ForEach items={sorted}>
          {(record, i) => (
            <TableRow
              onClick={() => setSelected(record.id)}
              className={cn(
                { "bg-sky-200 hover:bg-sky-100 text-foreground": selected === record.id },
                { "bg-red-300 text-foreground": record.isCredit },
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
