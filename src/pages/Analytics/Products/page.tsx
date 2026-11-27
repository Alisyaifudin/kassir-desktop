import { Fragment, memo, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { Stream } from "effect";
import { Link } from "~/services/route/react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Loader, useQuery } from "~/components/Loader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { MODE_NAMES, SEARCH_DELAY } from "~/lib/constants";
import { formatDate, formatTime } from "~/lib/date";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { ProductGroup, ProductInstance } from "~/services/analytics";
import type { RecordMode } from "~/services/record";
import { useRange } from "../use-range";
import { singleOpen, useOpenLines, useOpenProduct } from "./use-open";
import { useSort } from "./use-sort";
import { money } from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";

const PAGE_SIZES = [25, 50, 100];

/**
 * Every product that moved in the period: the totals band above, then the table
 * with all of them — sorting, search, pagination, and an accordion of the
 * individual record lines behind each product.
 */
export default function Page() {
  const { from, to } = useRange();
  const [mode, setMode] = useState<RecordMode>("incoming");
  const res = useQuery(
    () => Stream.fromEffect(service.analytics.get.productGroups(from, to, mode)),
    [from, to, mode],
  );

  return (
    <AnalyticsErrorBoundary fallback={AnalyticsErrorFallback}>
      <Loader
        res={res}
        fallback={
          <div className="flex flex-col gap-3">
            <SummarySkeleton />
            <ChartSkeleton />
          </div>
        }
      >
        {({ data }) => <Body groups={data} from={from} to={to} mode={mode} onMode={setMode} />}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

/**
 * What the period adds up to, read off the same rows the table holds — no extra
 * query, and it moves with the Masuk/Keluar switch because the rows do.
 *
 * `laba` is only the margin of lines that carried a stored cost, so the hint
 * names both counts: a product whose modal was never recorded contributes
 * omzet and nothing else, and silently folding that into the total would read
 * as a shop with a finer margin than it has.
 */
const Totals = memo(function Totals({ groups }: { groups: ProductGroup[] }) {
  const totals = useMemo(() => {
    let omzet = 0;
    let laba = 0;
    let costed = 0;
    let lines = 0;
    for (const row of groups) {
      omzet += row.revenue;
      laba += row.margin;
      costed += row.costed;
      lines += row.lines;
    }
    return { omzet, laba, costed, lines };
  }, [groups]);

  const uncosted = totals.lines - totals.costed;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Total omzet" value={money(totals.omzet)} hint={`dari ${totals.lines} baris`} />
      <Stat
        label="Total laba"
        value={totals.costed === 0 ? "—" : money(totals.laba)}
        hint={
          totals.costed === 0
            ? "belum ada baris bermodal"
            : uncosted === 0
              ? `${totals.costed} baris bermodal`
              : `${totals.costed} baris bermodal · ${uncosted} tanpa modal tepercaya`
        }
      />
      <Stat
        label="Produk"
        value={groups.length.toLocaleString("id-ID")}
        hint="barang berbeda pada periode ini"
      />
    </div>
  );
});

/**
 * The period's products, in the one view that reads them: the totals band and
 * the table.
 *
 * The transaction-type switch and the table are separate components because they
 * change for different reasons: flipping the switch re-renders the shell, while
 * typing in the table's search box must not — `ProductsTable` is memoised on the
 * period, the mode and the group list, which are the only things it reads.
 */
function Body({
  groups,
  from,
  to,
  mode,
  onMode,
}: {
  groups: ProductGroup[];
  from: number;
  to: number;
  mode: RecordMode;
  onMode: (mode: RecordMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1" role="group" aria-label="Jenis transaksi">
        <Button
          size="sm"
          variant={mode === "incoming" ? "default" : "ghost"}
          aria-pressed={mode === "incoming"}
          onClick={() => onMode("incoming")}
        >
          {MODE_NAMES.incoming}
        </Button>
        <Button
          size="sm"
          variant={mode === "outcoming" ? "default" : "ghost"}
          aria-pressed={mode === "outcoming"}
          onClick={() => onMode("outcoming")}
        >
          {MODE_NAMES.outcoming}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border bg-card p-3 text-sm text-muted-foreground">
          Belum ada barang pada periode ini.
        </p>
      ) : (
        <>
          <Totals groups={groups} />
          <p className="text-sm text-muted-foreground">
            Laba hanya dijumlah dari baris yang modalnya tercatat dan tidak lebih tinggi dari harga
            jualnya. Baris yang dijual seharga modalnya ikut dijumlah dengan laba nol. Baris dengan
            modal nol, atau modal yang lebih tinggi dari harga jualnya — tanda modal yang salah
            catat — tidak ikut dijumlah dan labanya ditandai —, supaya angkanya tidak terbaca
            sebagai kerugian.
          </p>
          <ProductsTable groups={groups} from={from} to={to} mode={mode} />
        </>
      )}
    </div>
  );
}

/**
 * All of the period's products: the search box, the sortable table, and the
 * accordion of record lines behind each row.
 *
 * The search field holds every keystroke and the table filters on the settled
 * value — filtering and re-sorting the whole list per keystroke is what made the
 * box feel slow to type in.
 */
const ProductsTable = memo(function ProductsTable({
  groups,
  from,
  to,
  mode,
}: {
  groups: ProductGroup[];
  from: number;
  to: number;
  mode: RecordMode;
}) {
  // Ordered by the URL and not by state: a row opens a product, and stepping back has
  // to return to the same ordering. See `useSort`.
  const [sorting, setSorting] = useSort();
  // The accordion is the URL's, one product at a time: the rows behind it are read for
  // that product, and opening its page from the row's pencil and stepping back has to
  // find them still open. See `useOpenProduct`.
  const [open, setOpen] = useOpenProduct();
  const expanded = useMemo<ExpandedState>(
    () => (open === null ? {} : { [open]: true }),
    [open],
  );
  const [globalFilter, setGlobalFilter] = useState("");
  // `useDebounce` hands back `[value, controls]`; the filter wants the value.
  // Passing the tuple made every row fail the match — the table read "0 dari 0
  // produk" no matter what was typed.
  const [settledFilter] = useDebounce(globalFilter, SEARCH_DELAY);

  const columns = useMemo<ColumnDef<ProductGroup>[]>(
    () => [
      {
        id: "no",
        header: "No",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">{row.index + 1}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Produk",
        cell: ({ row }) => (
          <ProductCell
            group={row.original}
            open={row.getIsExpanded()}
            onToggle={() => row.toggleExpanded()}
          />
        ),
      },
      {
        accessorKey: "qty",
        header: "Qty",
        cell: ({ getValue }) => getValue<number>().toLocaleString("id-ID"),
      },
      {
        accessorKey: "revenue",
        header: "Omzet",
        cell: ({ getValue }) => money(getValue<number>()),
      },
      {
        accessorKey: "margin",
        header: "Laba",
        cell: ({ row }) =>
          row.original.costed === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            money(row.original.margin)
          ),
      },
      {
        accessorKey: "lines",
        header: "Baris",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground tabular-nums">{getValue<number>()}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: groups,
    columns,
    // A row's id is the product it stands for, not its place in the list: the
    // accordion is kept by id, so sorting or filtering the table must not hand the
    // open state to whichever product happens to land on that index now.
    getRowId: (group) => group.key,
    state: { sorting, expanded, globalFilter: settledFilter },
    onSortingChange: setSorting,
    // A URL names one order; tanstack's third click ("no sort") would leave the
    // table with none, and there is no param for that.
    enableSortingRemoval: false,
    // One at a time — see `singleOpen` for why the changed key decides.
    onExpandedChange: (updater) => {
      const next = typeof updater === "function" ? updater(expanded) : updater;
      setOpen(singleOpen(expanded, next));
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value) =>
      row.original.name.toLowerCase().includes(String(value).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: { pagination: { pageSize: 25 } },
  });

  const filtered = table.getFilteredRowModel().rows.length;
  const page = table.getState().pagination.pageIndex;
  const size = table.getState().pagination.pageSize;
  const first = filtered === 0 ? 0 : page * size + 1;
  const last = Math.min(filtered, page * size + table.getRowModel().rows.length);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <h2 className="text-sm font-semibold">Semua produk</h2>
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.currentTarget.value)}
          placeholder="Cari produk"
          aria-label="Cari produk"
          className="w-[280px] max-w-full"
        />
      </div>

      <Table
        className="text-base"
        parentClass="max-h-none overflow-visible"
        aria-label="Semua produk pada periode ini"
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                    }
                    className={cn("whitespace-nowrap", ALIGN[header.column.id])}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "flex w-full items-center gap-1 hover:text-foreground",
                          ALIGN[header.column.id] === "text-right"
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="size-5" aria-hidden="true" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-5" aria-hidden="true" />
                        ) : (
                          <ArrowUpDown className="size-5 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <TableRow className="hover:bg-muted/40">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={ALIGN[cell.column.id]}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {row.getIsExpanded() ? (
                <TableRow>
                  <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                    <Instances group={row.original} from={from} to={to} mode={mode} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {first}–{last} dari {filtered} produk
        </span>
        <div className="flex items-center gap-2">
          <Select value={String(size)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger aria-label="Baris per halaman" className="h-9 w-[180px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} / hal
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </section>
  );
});

/**
 * Whether a line's stored cost can be read as one: above zero, and below what
 * the line sold for.
 *
 * The same rule the analytics service applies (`believable` in `live.ts`), and
 * it has to be applied in both places: a sale of "Kartu Elektronik Mandiri"
 * carries a `modal` of 2.327.000 against a 100.000 price — a purchase entered
 * with the wrong figure, inherited by every sale that drew from that lot — and
 * subtracting it reads as a 2,2 juta loss per card. The line is not a loss; its
 * cost just cannot be believed, so it is left out of the margin instead.
 */
function believable(line: ProductInstance): boolean {
  return line.capital > 0 && line.capital <= line.price;
}

/** Column alignment, keyed by column id — money and counts sit right. */
const ALIGN: Record<string, string> = {
  no: "w-12",
  qty: "text-right",
  revenue: "text-right",
  margin: "text-right",
  lines: "text-right",
};

/** The product row: expand, read the name, or jump to the product's page. */
function ProductCell({
  group,
  open,
  onToggle,
}: {
  group: ProductGroup;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-w-0 items-center gap-1 rounded-sm text-left hover:text-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="size-5 shrink-0" />
        ) : (
          <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
        )}
        <span className="truncate">{group.name}</span>
      </button>
      {group.productId === null ? null : (
        <Link
          // A step: the product is opened from this row, so `Back` returns to it.
          to={`/products/${group.productId}`}
          behavior="push"
          aria-label={`Buka produk ${group.name}`}
          title="Buka produk"
          className="shrink-0 rounded-sm text-muted-foreground hover:text-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Pencil aria-hidden="true" className="size-5" />
        </Link>
      )}
    </div>
  );
}

/** How many of a product's record lines one accordion page holds. */
const INSTANCE_PAGE_SIZE = 10;

/**
 * The accordion body: the record lines behind the product, newest first, **a page at a
 * time** — a product that moved 90 times in the period is 90 rows, and opened inline
 * under a table row they buried the rest of the list.
 *
 * The page lives beside the open product in the URL (`?lines=`), not in state: a line
 * links to its record, and stepping back has to find the same page of them.
 */
function Instances({
  group,
  from,
  to,
  mode,
}: {
  group: ProductGroup;
  from: number;
  to: number;
  mode: RecordMode;
}) {
  const [asked, setPage] = useOpenLines();
  // The URL can name a page the period no longer has — a narrower range, another
  // product — so the page the table reads is the one that exists.
  const pages = Math.max(1, Math.ceil(group.lines / INSTANCE_PAGE_SIZE));
  const page = Math.min(asked, pages);
  const res = useQuery(
    () =>
      Stream.fromEffect(
        service.analytics.get.productInstances(
          from,
          to,
          mode,
          group.key,
          INSTANCE_PAGE_SIZE,
          (page - 1) * INSTANCE_PAGE_SIZE,
        ),
      ),
    [from, to, mode, group.key, page],
    // Paging should not blank the rows and draw them again a beat later.
    { keepPrevious: true },
  );

  return (
    <div className="bg-muted/20 p-2">
      <Loader
        res={res}
        fallback={
          <div className="flex flex-col gap-1 rounded-md border bg-card p-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        }
      >
        {({ data }) => (
          <InstanceList
            lines={data}
            total={group.lines}
            page={page}
            pages={pages}
            onPage={setPage}
          />
        )}
      </Loader>
    </div>
  );
}

/**
 * One page of a product's lines.
 *
 * A real table, not a grid of fixed columns: a rupiah figure is not 140px, and the
 * product name has to wrap instead of being squeezed into an ellipsis by a datetime
 * column that claimed 200px for itself.
 */
function InstanceList({
  lines,
  total,
  page,
  pages,
  onPage,
}: {
  lines: ProductInstance[];
  total: number;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const first = (page - 1) * INSTANCE_PAGE_SIZE + 1;
  const last = first + lines.length - 1;

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-muted-foreground">
            {/* `w-px` is a table's "as narrow as the content": the four figures keep to
                themselves and the name gets everything that is left. */}
            <th scope="col" className="w-px px-2 py-1 text-left font-normal whitespace-nowrap">
              Waktu
            </th>
            <th scope="col" className="px-2 py-1 text-left font-normal">
              Produk
            </th>
            <th scope="col" className="w-px px-2 py-1 text-right font-normal whitespace-nowrap">
              Qty
            </th>
            <th scope="col" className="w-px px-2 py-1 text-right font-normal whitespace-nowrap">
              Omzet
            </th>
            <th scope="col" className="w-px px-2 py-1 text-right font-normal whitespace-nowrap">
              Laba
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.recordId}-${index}`} className="border-b last:border-0">
              <td className="px-2 py-1 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                {formatDate(line.at)} {formatTime(line.at)}
              </td>
              <td className="px-2 py-1">
                <Link
                  // A step: the record is opened from this line, so `Back` returns here.
                  to={`/records/${line.recordId}`}
                  behavior="push"
                  className="underline-offset-4 hover:text-active hover:underline"
                  title="Buka catatan transaksi"
                >
                  {line.name}
                </Link>
              </td>
              <td className="px-2 py-1 text-right text-sm tabular-nums whitespace-nowrap">
                {line.qty.toLocaleString("id-ID")}
                {line.unit > 1 ? <span className="text-muted-foreground"> × {line.unit}</span> : null}
              </td>
              <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap">
                {money(line.total)}
              </td>
              <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap">
                {believable(line) ? (
                  money(line.total - line.capital * line.qty)
                ) : (
                  <span
                    className="text-muted-foreground"
                    title="Modal baris ini tidak tercatat, atau lebih tinggi dari harga jualnya — tidak bisa dipercaya sebagai modal"
                  >
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-2 py-1 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {first}–{last} dari {total} baris
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
