import { useCallback, useMemo, type KeyboardEvent } from "react";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import {
  Table,
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
import {
  EMPTY_SELECTION,
  recordPaymentLines,
  type MethodSelection,
  type PaymentLine,
} from "../method-filter";

export function List({
  records,
  selection = EMPTY_SELECTION,
}: {
  records: RecordModel[];
  /**
   * The method filter. A split payment only lists the methods it lets through,
   * so the `Total` column can never show a payment the list was asked to hide.
   */
  selection?: MethodSelection;
}) {
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
      // Only record rows are focusable: a record's payment lines are a
      // breakdown of the row above them, not rows of their own.
      const rows = event.currentTarget
        .closest("table")
        ?.querySelectorAll<HTMLTableRowElement>("tr[data-record]");
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
    <Table className="text-base" aria-label="Daftar transaksi hari ini">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30px] font-normal">No</TableHead>
          <TableHead className={cn("text-center w-[150px] font-normal")}>
            Kasir
          </TableHead>
          <TableHead
            className="w-[120px] font-normal"
            aria-sort={order === "time" ? (sort === "asc" ? "ascending" : "descending") : "none"}
          >
            <SortBtn
              onClick={() => handleClickSort("time")}
              sort={order === "time" ? sort : undefined}
              className="justify-center"
            >
              Waktu
            </SortBtn>
          </TableHead>
          <TableHead
            className="font-normal"
            aria-sort={
              order === "total" ? (sort === "asc" ? "ascending" : "descending") : "none"
            }
          >
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
          (selected / credit) rows keep full contrast against their background.

          One row group per record. A split payment stacks a figure per payment
          under `Total`, and the record's own cells (number, cashier, time) span
          them, so the group reads as one record that happened to be paid more
          than one way rather than as several records. The tint (hover, selected)
          and the click target have to reach every row of the group, which needs
          an ancestor above the rows (a row cannot reach its siblings). The rule
          belongs *between* records, so only the group's last row draws it. */}
      <ForEach items={sorted}>
        {(record, i) => {
          const lines = recordPaymentLines(record, selection);
          // A record with nothing to break down — a credit with no settlement
          // yet, or a filter that hid every payment — keeps its grand total in
          // the single row it has always had.
          const split = lines.length > 1;
          const isSelected = selected === record.id;
          // A selected row lightens under the pointer; a credit keeps its red.
          const hoverTint =
            isSelected && !record.isCredit
              ? "group-hover/rec:bg-sky-100"
              : "group-hover/rec:bg-muted/50";

          return (
            <tbody
              key={record.id}
              className={cn(
                "group/rec text-muted-foreground",
                "[&>tr]:border-b-0 [&:not(:last-child)>tr:last-child]:border-b",
              )}
            >
              <TableRow
                // Marks the only rows the keyboard model walks: a second amount
                // belongs to the record above it, it is not a row of its own.
                data-record=""
                // One row is in the tab order: the selected one (or the first,
                // before anything is picked). Up/Down/Home/End move focus inside
                // the list, Enter (or Space) opens the row under the cursor.
                tabIndex={i === tabStop ? 0 : -1}
                aria-selected={isSelected}
                onKeyDown={handleRowKeyDown(i)}
                onClick={() => setSelected(record.id)}
                className={cn(
                  "cursor-pointer hover:bg-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none",
                  hoverTint,
                  {
                    "bg-sky-200 text-foreground font-semibold ring-1 ring-inset ring-primary":
                      isSelected,
                  },
                  { "bg-red-300 text-foreground": record.isCredit },
                )}
              >
                {/* Vertically centred over the record's rows: the number labels
                    the group, not its first payment. The cashier and the time
                    span them for the same reason — they say whose record it is
                    and when, once, however many ways it was paid. */}
                <TableCell rowSpan={split ? lines.length : undefined} className="align-middle">
                  {i + 1}
                </TableCell>
                <TableCell
                  rowSpan={split ? lines.length : undefined}
                  className="text-center align-middle"
                >
                  {capitalize(record.cashier)}
                </TableCell>
                <TableCell
                  rowSpan={split ? lines.length : undefined}
                  className="text-center align-middle"
                >
                  {formatTime(record.date)}
                </TableCell>
                <TableCell className="text-right">
                  <Amount line={lines[0]} fallback={record.grandTotal} />
                </TableCell>
              </TableRow>
              {lines.slice(1).map((line) => (
                // The record's first three cells are the `rowSpan` above, so this
                // cell lands under `Total` on its own. The amount prints no
                // method name — that is the point of the column — but a screen
                // reader still hears which one it is (`Amount`), and a pointer
                // here still opens the record the amount belongs to.
                <TableRow
                  key={line.key}
                  onClick={() => setSelected(record.id)}
                  className={cn("cursor-pointer hover:bg-transparent", hoverTint, {
                    "bg-sky-200 text-foreground": isSelected,
                    "bg-red-300 text-foreground": record.isCredit,
                  })}
                >
                  <TableCell className="text-right">
                    <Amount line={line} />
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          );
        }}
      </ForEach>
    </Table>
  );
}

/**
 * One figure in the `Total` column. `line` is a payment's contribution; without
 * one (a credit with nothing settled yet, a filter that hid every payment) the
 * record's grand total stands in, which is what the row showed before the column
 * learned to break a split down.
 *
 * The method is named for assistive tech only: the column is money, one figure
 * per payment, but a bare number is exactly what a screen reader cannot attach to
 * the row it belongs to.
 */
function Amount({ line, fallback }: { line?: PaymentLine; fallback?: number }) {
  const value = line?.contribution ?? fallback ?? 0;
  return (
    <>
      {line === undefined ? null : <span className="sr-only">{line.label} </span>}
      {value.toLocaleString("id-ID")}
    </>
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
  // The direction used to be an unlabelled lucide arrow, so both states read as
  // "Total" and a screen-reader operator could re-sort without hearing that
  // anything happened. The name carries the column and the direction; the arrow
  // is decoration (the `<th aria-sort>` also announces the state on the cell).
  const direction = sort === undefined ? "" : sort === "asc" ? ", naik" : ", turun";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Urutkan menurut ${children}${direction}`}
      className={cn(
        "p-0 w-full h-full flex items-center hover:shadow-md",
        sort === undefined ? undefined : "justify-between",
        className,
      )}
    >
      <span>{children}</span>
      {sort === undefined ? null : sort === "desc" ? (
        <ArrowDownWideNarrow aria-hidden="true" />
      ) : (
        <ArrowDownNarrowWide aria-hidden="true" />
      )}
    </button>
  );
}
