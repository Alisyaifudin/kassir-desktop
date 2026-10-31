import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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

/** The two columns that order the list — the pair `useOrder` stores. */
type Order = "time" | "total";

/**
 * How tall one line of the table is: `py-2` twice, the `text-base` line box and
 * the border under it. This is only the virtualizer's first guess — every record
 * group on screen is measured, so a cashier name that wraps costs a correction
 * after the first paint instead of putting every row after it in the wrong place.
 */
const LINE_HEIGHT = 41;

/** Records drawn beyond the viewport on each side, so a flick of the wheel is not blank. */
const OVERSCAN = 8;

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

  // Every record's `Total` column, built once per list and filter: the cell
  // prints the first line, the extra rows stack the rest, and the virtualizer
  // needs the count to guess a record's height before it has measured one.
  const linesById = useMemo(() => {
    const lines = new Map<string, PaymentLine[]>();
    for (const record of records) lines.set(record.id, recordPaymentLines(record, selection));
    return lines;
  }, [records, selection]);

  const sorted = useSorted(records, order, sort);

  const columns = useMemo<ColumnDef<RecordModel>[]>(
    () => [
      {
        id: "no",
        header: "No",
        // A record's number is its place in the list as it is shown, so it is
        // read from the row index — `manualSorting` keeps that index the
        // display position (see the table below).
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "cashier",
        header: "Kasir",
        cell: ({ row }) => capitalize(row.original.cashier),
      },
      {
        id: "time",
        header: "Waktu",
        // An accessor is what makes a column sortable at all (`getCanSort`
        // requires one), and it names the value the header orders by. The order
        // itself is applied above, in `useSorted`.
        accessorFn: (record) => record.date,
        cell: ({ row }) => formatTime(row.original.date),
      },
      {
        id: "total",
        header: "Total",
        accessorFn: (record) => record.grandTotal,
        cell: ({ row }) => (
          <Amount
            line={linesById.get(row.original.id)?.[0]}
            fallback={row.original.grandTotal}
          />
        ),
      },
    ],
    [linesById],
  );

  // The URL is the source of truth for the order (see `useOrder`), so the table
  // is told what it is rather than keeping its own copy.
  const sorting = useMemo<SortingState>(
    () => [{ id: order, desc: sort === "desc" }],
    [order, sort],
  );

  const table = useReactTable({
    // Already sorted, so tanstack must not sort a second time — and because the
    // data arrives in display order, `row.index` *is* the row's place in the
    // list, which is what the `No` column prints. Sorting above (rather than in
    // the row model) keeps the URL the one place an order is decided.
    data: sorted,
    columns,
    manualSorting: true,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const picked = next[0];
      if (picked === undefined) return;
      setOrder(picked.id as Order, picked.desc ? "desc" : "asc");
    },
    // A first click on either column adopts the direction already in use, so
    // the list keeps reading the same way when the operator changes what it is
    // ordered by; a click on the column already ordering it flips it. There is
    // no third state: the URL always names a column.
    sortDescFirst: sort === "desc",
    enableSortingRemoval: false,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });
  const rows = table.getRowModel().rows;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLTableSectionElement | null>(null);
  const [headHeight, setHeadHeight] = useState(0);

  // The header is sticky but still sits in the flow, so the first record starts
  // one header below the scroll container's origin. `scrollMargin` is that
  // offset: without it the virtualizer measures every record a header's height
  // too high and draws one row fewer than the viewport shows.
  useLayoutEffect(() => {
    const head = headRef.current;
    if (head === null) return;
    const measure = () => setHeadHeight(head.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  // A virtual item is one *record*, not one line: a split payment's figures are
  // extra rows of the same group (a `rowSpan` cannot be absolutely positioned,
  // so the rows stay in the flow and only the window is swapped out).
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const record = rows[index]?.original;
      const lines = record === undefined ? 0 : (linesById.get(record.id)?.length ?? 0);
      return LINE_HEIGHT * Math.max(1, lines);
    },
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: OVERSCAN,
    scrollMargin: headHeight,
  });

  const items = virtualizer.getVirtualItems();
  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  // Until the viewport has a height the virtualizer draws nothing — it cannot
  // say which records would fit in no space. Rather than show an empty table in
  // that moment (and anywhere nothing is laid out: a print view, a test
  // renderer), the list draws every record, which is what it did before it
  // virtualized. The first measurement replaces that with a window.
  const windowed = items.length > 0;
  const visible = windowed
    ? items.map((item) => item.index)
    : rows.map((_, index) => index);

  // Blank rows standing in for the records outside the window, so the
  // scrollbar describes the whole day rather than the part on screen.
  const padTop =
    firstItem === undefined ? 0 : Math.max(0, firstItem.start - headHeight);
  const padBottom =
    lastItem === undefined
      ? 0
      : Math.max(0, virtualizer.getTotalSize() - (lastItem.end - headHeight));

  // Roving tabindex, the model the POS grids use: the list is a single tab
  // stop, and Up/Down/Home/End move focus inside it. Every row at `tabIndex={0}`
  // would make Tab crawl through a whole day of records before reaching the
  // detail pane. The stop follows the selection, and falls back to the first
  // record on screen when scrolling has carried the selected one out of the
  // window — otherwise Tab would find nothing to land on.
  const tabStop = useMemo(() => {
    const index = rows.findIndex((row) => row.original.id === selected);
    if (index === -1) return visible[0] ?? 0;
    return visible.includes(index) ? index : (visible[0] ?? 0);
  }, [rows, selected, visible]);

  // A record that is scrolled out of the window has no row in the DOM, so a jump
  // happens in two steps: bring the record into the window, then focus the row
  // the window grew. Until it exists the target is kept, and the next render
  // tries again.
  const [focusTarget, setFocusTarget] = useState<number | null>(null);

  useEffect(() => {
    if (focusTarget === null) return;
    const row = scrollRef.current?.querySelector<HTMLElement>(
      `[data-record-index="${focusTarget}"]`,
    );
    if (row === null || row === undefined) return;
    row.focus();
    setFocusTarget(null);
  }, [focusTarget, visible]);

  // Opening a record from elsewhere — a refresh with `?selected=`, the detail
  // pane's own links — must not leave it below the fold.
  useEffect(() => {
    if (selected === null) return;
    const index = rows.findIndex((row) => row.original.id === selected);
    if (index !== -1) virtualizer.scrollToIndex(index, { align: "auto" });
  }, [selected, rows, virtualizer]);

  const moveFocus = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "auto" });
      setFocusTarget(index);
    },
    [virtualizer],
  );

  // Up/Down move the *focus* (so Tab does not have to walk every row); Enter or
  // Space then selects. Same mental model as the POS grids. The target comes
  // from the data, not from the rows in the DOM: most of the day is not
  // rendered at any moment, and End still has to reach the last record.
  const handleRowKeyDown = useCallback(
    (index: number) => (event: KeyboardEvent<HTMLTableRowElement>) => {
      const record = rows[index]?.original;
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
      const target =
        event.key === "ArrowDown"
          ? index + 1
          : event.key === "ArrowUp"
            ? index - 1
            : event.key === "Home"
              ? 0
              : rows.length - 1;
      moveFocus(Math.min(Math.max(target, 0), rows.length - 1));
    },
    [rows, setSelected, moveFocus],
  );

  return (
    // `table-fixed` is what keeps the columns still: an auto layout would
    // measure them from the handful of rows currently on screen, so the columns
    // would twitch as the list scrolled. The header's widths now define them.
    <Table
      className="text-base table-fixed"
      parentClass="h-full"
      parentRef={scrollRef}
      aria-label="Daftar transaksi hari ini"
    >
      <TableHeader ref={headRef}>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const state = header.column.getIsSorted();
              const canSort = header.column.getCanSort();
              return (
                <TableHead
                  key={header.id}
                  className={COLUMN[header.column.id]?.head}
                  // Only a column that can be ordered claims an order; the
                  // number and the cashier are not sortable, and `none` on them
                  // would promise a control that is not there.
                  aria-sort={
                    canSort
                      ? state === "asc"
                        ? "ascending"
                        : state === "desc"
                          ? "descending"
                          : "none"
                      : undefined
                  }
                >
                  {canSort ? (
                    <SortBtn
                      // The headers are plain strings; a header component would
                      // need `flexRender` here instead.
                      label={String(header.column.columnDef.header)}
                      sort={state === false ? undefined : state}
                      onClick={header.column.getToggleSortingHandler()}
                      className={COLUMN[header.column.id]?.sort}
                    />
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
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
          belongs *between* records, so only the group's last row draws it — and
          "last" is read from the data, not from the DOM, which holds only the
          window: the bottom-most record on screen is not the day's last one. */}
      {padTop > 0 ? <Spacer height={padTop} colSpan={table.getAllLeafColumns().length} /> : null}
      {visible.map((index) => {
        const row = rows[index];
        if (row === undefined) return null;
        const record = row.original;
        const lines = linesById.get(record.id) ?? [];
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
            key={row.id}
            // The virtualizer measures this group, `rowSpan` and all, so a
            // record whose name wraps is corrected after it first paints.
            ref={virtualizer.measureElement}
            data-index={index}
            className={cn(
              "group/rec text-muted-foreground [&>tr]:border-b-0",
              index < rows.length - 1 && "[&>tr:last-child]:border-b",
            )}
          >
            <TableRow
              // Marks the only rows the keyboard model walks: a second amount
              // belongs to the record above it, it is not a row of its own.
              data-record=""
              data-record-index={index}
              // One row is in the tab order: the selected one (or the first,
              // before anything is picked). Up/Down/Home/End move focus inside
              // the list, Enter (or Space) opens the row under the cursor.
              tabIndex={index === tabStop ? 0 : -1}
              aria-selected={isSelected}
              onKeyDown={handleRowKeyDown(index)}
              onClick={() => setSelected(record.id)}
              className={cn("cursor-pointer peer hover:bg-muted", hoverTint, {
                "bg-sky-200 text-foreground font-semibold": isSelected,
              }, { "bg-red-300 text-foreground": record.isCredit })}
            >
              {/* Vertically centred over the record's rows: the number labels
                  the group, not its first payment. The cashier and the time
                  span them for the same reason — they say whose record it is
                  and when, once, however many ways it was paid. `Total` is the
                  one cell that never spans: it is what is being broken down. */}
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  rowSpan={split && cell.column.id !== "total" ? lines.length : undefined}
                  className={cn("align-middle", COLUMN[cell.column.id]?.cell)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
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
                className={cn("cursor-pointer peer-hover:bg-muted", hoverTint, {
                  "bg-sky-200 text-foreground": isSelected,
                  "bg-red-300 text-foreground": record.isCredit,
                })}
              >
                <TableCell className={cn("align-middle", COLUMN.total?.cell)}>
                  <Amount line={line} />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        );
      })}
      {padBottom > 0 ? (
        <Spacer height={padBottom} colSpan={table.getAllLeafColumns().length} />
      ) : null}
    </Table>
  );
}

/**
 * The space a record outside the window would have taken. Hidden from the
 * accessibility tree (and from `role="row"` queries): it stands in for rows that
 * are not shown, it is not a row anybody can read or click.
 */
function Spacer({ height, colSpan }: { height: number; colSpan: number }) {
  return (
    <tbody aria-hidden="true">
      <tr>
        <td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
      </tr>
    </tbody>
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
  order: Order,
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

/**
 * Column widths, alignment and the header button's own alignment, keyed by
 * column id — money sits right, the record's own columns centre.
 *
 * The widths are **percentages, and they add up to 100**, because the table is
 * `table-fixed` (see the `Table` below): a fixed layout honours the first row's
 * widths exactly instead of shrinking columns to fit, so a set of pixel widths
 * that didn't fit the pane would not squeeze the last column — it would give it
 * nothing and let its figures spill across the neighbour. The list pane is a
 * fixed 300px (`grid-cols-[300px_1px_1fr]`), so this splits it into roughly
 * 36 / 84 / 72 / 108px: enough for a three-digit number, a cashier's name, a
 * `14:03`, and a figure in the hundreds of thousands.
 */
const COLUMN: Record<string, { head?: string; cell?: string; sort?: string }> = {
  no: { head: "w-[12%] font-normal", cell: "tabular-nums" },
  cashier: { head: "w-[28%] text-center font-normal", cell: "text-center" },
  time: {
    head: "w-[26%] text-center font-normal",
    cell: "text-center whitespace-nowrap",
    sort: "justify-center",
  },
  total: { head: "w-[34%] font-normal", cell: "text-right tabular-nums", sort: "justify-end" },
};

function SortBtn({
  label,
  sort,
  onClick,
  className,
}: {
  label: string;
  sort?: "asc" | "desc";
  onClick?: (event: unknown) => void;
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
      aria-label={`Urutkan menurut ${label}${direction}`}
      className={cn(
        "p-0 w-full h-full flex items-center hover:shadow-md",
        sort === undefined ? undefined : "justify-between",
        className,
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
      {sort === undefined ? null : sort === "desc" ? (
        <ArrowDownWideNarrow aria-hidden="true" className="size-4 shrink-0" />
      ) : (
        <ArrowDownNarrowWide aria-hidden="true" className="size-4 shrink-0" />
      )}
    </button>
  );
}
