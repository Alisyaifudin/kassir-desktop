import { Fragment, useMemo, useState } from "react";
import { Stream } from "effect";
import { Link } from "react-router";
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
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { formatDate, formatTime } from "~/lib/date";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { ProductGroup, ProductInstance } from "~/services/analytics";
import type { RecordMode } from "~/services/record";
import { useRange } from "../use-range";
import {
  ChartEmpty,
  ChartFrame,
  COLORS,
  TOOLTIP,
  money,
  moneyTick,
  useChartGeometry,
} from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton } from "../z-Loading";

type Metric = "revenue" | "qty" | "margin";

const METRICS: { key: Metric; label: string }[] = [
  { key: "revenue", label: "Omzet" },
  { key: "qty", label: "Qty" },
  { key: "margin", label: "Laba" },
];

const PAGE_SIZES = [25, 50, 100];

/**
 * Every product that moved in the period, not a top-N: the chart shows the
 * leaders, the table below holds all of them with sorting, search, pagination,
 * and an accordion of the individual record lines behind each product.
 */
export default function Page() {
  const { from, to } = useRange();
  const [mode, setMode] = useState<RecordMode>("incoming");
  const [metric, setMetric] = useState<Metric>("revenue");
  const res = useQuery(
    () => Stream.fromEffect(service.analytics.get.productGroups(from, to, mode)),
    [from, to, mode],
  );

  return (
    <AnalyticsErrorBoundary fallback={AnalyticsErrorFallback}>
      <Loader res={res} fallback={<ChartSkeleton />}>
        {({ data }) => (
          <Body
            groups={data}
            from={from}
            to={to}
            mode={mode}
            onMode={setMode}
            metric={metric}
            onMetric={setMetric}
          />
        )}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

function Body({
  groups,
  from,
  to,
  mode,
  onMode,
  metric,
  onMetric,
}: {
  groups: ProductGroup[];
  from: number;
  to: number;
  mode: RecordMode;
  onMode: (mode: RecordMode) => void;
  metric: Metric;
  onMetric: (metric: Metric) => void;
}) {
  const geo = useChartGeometry();
  const [sorting, setSorting] = useState<SortingState>([{ id: "revenue", desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const top = useMemo(
    () => [...groups].sort((a, b) => b[metric] - a[metric]).slice(0, 8),
    [groups, metric],
  );
  const fill = metric === "margin" ? COLORS.laba : metric === "qty" ? COLORS.net : COLORS.omzet;

  const columns = useMemo<ColumnDef<ProductGroup>[]>(
    () => [
      {
        id: "no",
        header: "No",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-small text-muted-foreground tabular-nums">{row.index + 1}</span>
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
          <span className="text-small text-muted-foreground tabular-nums">
            {getValue<number>()}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: groups,
    columns,
    state: { sorting, expanded, globalFilter },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Jenis transaksi">
          <Button
            size="sm"
            variant={mode === "incoming" ? "default" : "ghost"}
            aria-pressed={mode === "incoming"}
            onClick={() => onMode("incoming")}
          >
            Jual
          </Button>
          <Button
            size="sm"
            variant={mode === "outcoming" ? "default" : "ghost"}
            aria-pressed={mode === "outcoming"}
            onClick={() => onMode("outcoming")}
          >
            Beli
          </Button>
        </div>
        <div
          className="flex items-center gap-0.5 rounded-md border bg-muted p-0.5"
          role="group"
          aria-label="Ukuran peringkat"
        >
          {METRICS.map((option) => (
            <Button
              key={option.key}
              size="sm"
              variant={metric === option.key ? "default" : "ghost"}
              aria-pressed={metric === option.key}
              className="rounded-sm"
              onClick={() => onMetric(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <ChartFrame title="Produk teratas">
          <ChartEmpty>Belum ada barang pada periode ini.</ChartEmpty>
        </ChartFrame>
      ) : (
        <>
          <ChartFrame
            title="Produk teratas"
            hint={
              metric === "qty" ? "jumlah terjual" : metric === "margin" ? "laba kotor" : "omzet"
            }
            label="Grafik produk teratas"
            chartClassName="h-[420px] small:h-[360px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 4, bottom: 8 }}
                barCategoryGap="26%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={geo.tick}
                  tickFormatter={metric === "qty" ? undefined : moneyTick}
                  minTickGap={28}
                  tickMargin={8}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={geo.yWidth + 140}
                  interval={0}
                  tick={(props) => {
                    const label = String(
                      (props.payload as { value?: unknown } | undefined)?.value ?? "",
                    );
                    const text = label.length > 18 ? `${label.slice(0, 17)}…` : label;
                    return (
                      <text
                        x={props.x}
                        y={props.y}
                        dx={-12}
                        dy={5}
                        textAnchor="end"
                        fill="var(--muted-foreground)"
                        fontSize={geo.tick.fontSize}
                      >
                        {text}
                      </text>
                    );
                  }}
                />
                <Tooltip
                  {...TOOLTIP}
                  formatter={(value) =>
                    metric === "qty" ? Number(value).toLocaleString("id-ID") : money(Number(value))
                  }
                />
                <Bar dataKey={metric} name="Nilai" fill={fill} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <section className="flex min-w-0 flex-col rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
              <h2 className="text-small font-semibold">Semua produk</h2>
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.currentTarget.value)}
                placeholder="Cari produk"
                aria-label="Cari produk"
                className="w-[280px] max-w-full"
              />
            </div>

            <Table
              className="text-normal"
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
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : "none"
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
                                <ArrowUp className="icon" aria-hidden="true" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="icon" aria-hidden="true" />
                              ) : (
                                <ArrowUpDown className="icon opacity-40" aria-hidden="true" />
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
              <span className="text-small text-muted-foreground tabular-nums">
                {first}–{last} dari {filtered} produk
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={String(size)}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger
                    aria-label="Baris per halaman"
                    className="h-9 w-[180px] small:w-[160px] text-small"
                  >
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
        </>
      )}
    </div>
  );
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
  const back = useGenerateUrlBack("/analytics/produk");
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-w-0 items-center gap-1 rounded-sm text-left hover:text-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="icon shrink-0" />
        ) : (
          <ChevronRight aria-hidden="true" className="icon shrink-0" />
        )}
        <span className="truncate">{group.name}</span>
      </button>
      {group.productId === null ? null : (
        <Link
          to={`/products/${group.productId}?url_back=${encodeURIComponent(back)}`}
          aria-label={`Buka produk ${group.name}`}
          title="Buka produk"
          className="shrink-0 rounded-sm text-muted-foreground hover:text-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Pencil aria-hidden="true" className="icon" />
        </Link>
      )}
    </div>
  );
}

/** The accordion body: every record line behind the product, newest first. */
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
  const back = useGenerateUrlBack("/analytics/produk");
  const res = useQuery(
    () => Stream.fromEffect(service.analytics.get.productInstances(from, to, mode, group.key, 200)),
    [from, to, mode, group.key],
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
        {({ data }) => <InstanceList lines={data} total={group.lines} back={back} />}
      </Loader>
    </div>
  );
}

function InstanceList({
  lines,
  total,
  back,
}: {
  lines: ProductInstance[];
  total: number;
  back: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="grid grid-cols-[200px_minmax(0,1fr)_80px_140px_140px_44px] gap-2 border-b bg-muted/40 px-2 py-1 text-small text-muted-foreground">
        <span>Waktu</span>
        <span>Produk</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Omzet</span>
        <span className="text-right">Laba</span>
        <span />
      </div>
      <ul className="divide-y">
        {lines.map((line, index) => (
          <li
            key={`${line.recordId}-${index}`}
            className="grid grid-cols-[200px_minmax(0,1fr)_80px_140px_140px_44px] items-center gap-2 px-2 py-1"
          >
            <span className="text-small text-muted-foreground tabular-nums whitespace-nowrap">
              {formatDate(line.at)} {formatTime(line.at)}
            </span>
            <Link
              to={`/records/${line.recordId}?url_back=${encodeURIComponent(back)}`}
              className="min-w-0 truncate underline-offset-4 hover:text-active hover:underline"
              title="Buka catatan transaksi"
            >
              {line.name}
            </Link>
            <span className="text-right text-small tabular-nums">
              {line.qty.toLocaleString("id-ID")}
              {line.unit > 1 ? <span className="text-muted-foreground"> × {line.unit}</span> : null}
            </span>
            <span className="text-right tabular-nums">{money(line.total)}</span>
            <span className="text-right tabular-nums">
              {line.capital > 0 ? (
                money(line.total - line.capital * line.qty)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
            <span className="text-center">
              {line.productId === null ? null : (
                <Link
                  to={`/products/${line.productId}?url_back=${encodeURIComponent(back)}`}
                  aria-label={`Buka produk ${line.name}`}
                  title="Buka produk"
                  className="inline-flex rounded-sm text-muted-foreground hover:text-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Pencil aria-hidden="true" className="icon" />
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>
      {total > lines.length ? (
        <p className="border-t px-2 py-1 text-small text-muted-foreground">
          Menampilkan {lines.length} baris terbaru dari {total}.
        </p>
      ) : null}
    </div>
  );
}
