import { useCallback, useMemo, type KeyboardEvent } from "react";
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
  const sorted = useSorted(records, order, sort);

  const handleClickSort = useCallback(
    (next: "time" | "total") => {
      const direction = order === next ? (sort === "asc" ? "desc" : "asc") : sort;
      setOrder(next, direction);
    },
    [order, sort, setOrder],
  );

  // Roving tabindex, the model the POS grids use: the list is a single tab
  // stop, and Up/Down/Home/End move focus inside it. Every row at `tabIndex={0}`
  // would make Tab crawl through a whole day of records before reaching the
  // detail pane.
  const tabStop = useMemo(() => {
    const index = sorted.findIndex((record) => record.id === selected);
    return index === -1 ? 0 : index;
  }, [sorted, selected]);

  // Up/Down move the *focus* (so Tab does not have to walk every row); Enter or
  // Space then selects. Same mental model as the POS grids.
  const handleRowKeyDown = useCallback(
    (index: number) => (event: KeyboardEvent<HTMLTableRowElement>) => {
      const record = sorted[index];
      if (record === undefined) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelected(record.id);
        return;
      }
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      )
        return;
      event.preventDefault();
      const rows = event.currentTarget
        .closest("tbody")
        ?.querySelectorAll<HTMLTableRowElement>("tr");
      if (rows === undefined || rows.length === 0) return;
      const target =
        event.key === "ArrowDown"
          ? index + 1
          : event.key === "ArrowUp"
            ? index - 1
            : event.key === "Home"
              ? 0
              : rows.length - 1;
      rows[Math.min(Math.max(target, 0), rows.length - 1)]?.focus();
    },
    [sorted, setSelected],
  );

  return (
    <Table className="text-normal" aria-label="Daftar transaksi hari ini">
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
              // One row is in the tab order: the selected one (or the first,
              // before anything is picked). Up/Down/Home/End move focus inside
              // the list, Enter (or Space) opens the row under the cursor.
              tabIndex={i === tabStop ? 0 : -1}
              aria-selected={selected === record.id}
              onKeyDown={handleRowKeyDown(i)}
              onClick={() => setSelected(record.id)}
              className={cn(
                "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none",
                {
                  "bg-sky-200 hover:bg-sky-100 text-foreground font-semibold ring-1 ring-inset ring-primary":
                    selected === record.id,
                },
                { "bg-red-300 text-foreground": record.isCredit },
              )}
            >
              <TableCell>{i + 1}</TableCell>
              <TableCell className="text-center">{capitalize(record.cashier)}</TableCell>
              <TableCell className="text-center">{formatTime(record.date)}</TableCell>
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

function useSorted(
  records: RecordModel[],
  order: "time" | "total",
  sort: "asc" | "desc",
): RecordModel[] {
  // Copy before sorting: `records` is a prop, and sorting it in place would
  // mutate the parent's array during render.
  return useMemo(() => {
    const sign = sort === "asc" ? 1 : -1;
    return [...records].sort((a, b) =>
      order === "time" ? sign * (a.date - b.date) : sign * (a.grandTotal - b.grandTotal),
    );
  }, [records, order, sort]);
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
