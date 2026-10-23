import { Fragment, memo, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import type { PocketType } from "~/services/money";
import { DeleteRecordBtn } from "./z-DeleteRecordBtn";
import type { MoneyRow } from "./use-data";

/**
 * The note column stays one line, cut at this many characters (ellipsis
 * included). Anything longer grows a chevron and an accordion; anything that
 * fits is shown as typed. Change this to change both.
 */
const NOTE_PREVIEW = 50;

function hasNote(note: string): boolean {
  return note.trim() !== "";
}

/**
 * Only a note the preview had to cut short earns an accordion: a note that fits
 * on the line is already fully readable, so a chevron on it would promise
 * nothing.
 */
function isTruncated(note: string): boolean {
  return note.replace(/\s+/g, " ").trim().length > NOTE_PREVIEW;
}

/**
 * One line, whitespace flattened, at most `NOTE_PREVIEW` characters. A note
 * that holds line breaks would otherwise push the row taller than its
 * neighbours, which is what the accordion is for.
 */
function previewNote(note: string): string {
  const flat = note.replace(/\s+/g, " ").trim();
  if (flat.length <= NOTE_PREVIEW) return flat;
  return `${flat.slice(0, NOTE_PREVIEW).trimEnd()}…`;
}

/** `+` only for a rise, so a drop reads as a drop at a glance. */
function Diff({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        value > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : value < 0
            ? "text-destructive"
            : "text-muted-foreground",
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toLocaleString("id-ID")}
    </span>
  );
}

export const TableList = memo(function TableList({
  money,
  type,
}: {
  money: MoneyRow[];
  type: PocketType;
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<MoneyRow>[]>(() => {
    const diff: ColumnDef<MoneyRow> = {
      id: "diff",
      header: "Selisih",
      cell: ({ row }) => <Diff value={row.original.diff} />,
    };
    return [
      {
        id: "no",
        header: "No",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: "day",
        header: "Hari",
        cell: ({ row }) => getDayName(row.original.timestamp),
      },
      {
        id: "date",
        header: "Tanggal",
        cell: ({ row }) => formatDate(row.original.timestamp, "long"),
      },
      {
        id: "time",
        header: "Waktu",
        cell: ({ row }) => formatTime(row.original.timestamp, "long"),
      },
      // The movement only means something for a pocket that keeps a running
      // balance; an `absolute` ledger has nothing to measure it against.
      ...(type === "change" ? [diff] : []),
      {
        id: "value",
        header: "Nilai",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            Rp{row.original.value.toLocaleString("id-ID")}
          </span>
        ),
      },
      {
        id: "note",
        header: "Catatan",
        cell: ({ row }) => <NoteCell row={row} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) =>
          // Only the newest entry can be removed: deleting from the middle would
          // have to renumber every balance above it.
          row.index === 0 ? (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <DeleteRecordBtn money={row.original} />
            </div>
          ) : null,
      },
    ];
  }, [type]);

  const table = useReactTable({
    data: money,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => isTruncated(row.original.note),
  });

  return (
    <Table className="text-normal">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn("whitespace-nowrap", COLUMN[header.column.id]?.head)}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const canExpand = row.getCanExpand();
          const isOpen = row.getIsExpanded();
          return (
            <Fragment key={row.id}>
              <TableRow
                // The whole row is the target, not just the chevron; the button in
                // the note cell is the keyboard path to the same toggle.
                onClick={canExpand ? () => row.toggleExpanded() : undefined}
                className={cn(canExpand ? "cursor-pointer" : "hover:bg-transparent")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={COLUMN[cell.column.id]?.cell}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {isOpen ? (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {/* The empty cell in front is the columns before `Catatan`, so
                      the full note starts under the column it belongs to instead
                      of under the row number. */}
                  <TableCell colSpan={noteIndex(row)} className="p-0" />
                  <TableCell
                    colSpan={row.getVisibleCells().length - noteIndex(row)}
                    className="p-0"
                  >
                    {/* `pre-wrap` keeps the note's own line breaks and tabs, so a
                        list typed into the textarea still reads as a list. */}
                    <p className="py-2 pr-3 whitespace-pre-wrap break-words [tab-size:4]">
                      {row.original.note}
                    </p>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
});

/** How many columns sit to the left of `Catatan`, for lining the accordion up. */
function noteIndex(row: Row<MoneyRow>): number {
  return row.getVisibleCells().findIndex((cell) => cell.column.id === "note");
}

/** Column widths and alignment, keyed by column id — money and counts sit right. */
const COLUMN: Record<string, { head?: string; cell?: string }> = {
  no: { head: "w-[60px] small:w-[48px]", cell: "text-muted-foreground" },
  // `whitespace-nowrap` on the reading columns is what keeps "15 Oktober 2026"
  // on one line: in an auto layout the browser is free to shrink a column to
  // its longest word, which turned the date into three lines.
  day: { head: "w-[130px] text-center small:w-[100px]", cell: "whitespace-nowrap text-center" },
  date: { head: "w-[280px] text-center small:w-[220px]", cell: "whitespace-nowrap text-center" },
  time: { head: "w-[150px] text-center small:w-[110px]", cell: "whitespace-nowrap text-center" },
  diff: { head: "w-[190px] text-right small:w-[140px]", cell: "whitespace-nowrap text-right" },
  value: { head: "w-[190px] text-right small:w-[140px]", cell: "whitespace-nowrap text-right" },
  note: {},
  actions: { head: "w-[60px] small:w-[48px]", cell: "text-right" },
};

/**
 * The note column: the note itself when it fits on the line, a truncated preview
 * that opens the full text when it does not, and an em dash when there is none.
 */
function NoteCell({ row }: { row: Row<MoneyRow> }) {
  if (!row.getCanExpand()) {
    return hasNote(row.original.note) ? (
      <span className="truncate">{previewNote(row.original.note)}</span>
    ) : (
      null
    );
  }

  return (
    <button
      type="button"
      aria-expanded={row.getIsExpanded()}
      onClick={(event) => {
        // The row itself toggles too; one click must not toggle twice.
        event.stopPropagation();
        row.toggleExpanded();
      }}
      className="flex min-w-0 w-full items-center gap-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {row.getIsExpanded() ? (
        <ChevronDown aria-hidden="true" className="icon shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight aria-hidden="true" className="icon shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{previewNote(row.original.note)}</span>
    </button>
  );
}
