import { useLimit } from "./use-limit";
import { usePage } from "./use-page";
import { useQuery } from "../use-query";
import { useSortDir } from "./use-sort-dir";
import { useSortBy } from "./use-sort-by";
import { useFilters } from "./use-filters";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { SquareArrowOutUpRight, ArrowDownNarrowWide, ArrowDownWideNarrow, ChevronLeft, ChevronRight } from "lucide-react";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { useMemo } from "react";
import { cn } from "~/lib/utils";
import { Product } from "~/services/product/type";
import { ProductType } from "~/services/product";

const columnHelper = createColumnHelper<Product>();

/* ------------------------------------------------------------------ */
/*  Sort button                                                        */
/* ------------------------------------------------------------------ */

function SortBtn({
  children,
  sort,
  onClick,
  className,
}: {
  children: React.ReactNode;
  sort: false | "asc" | "desc";
  onClick?: (e: unknown) => void;
  className?: string;
}) {
  if (sort === false) {
    return (
      <button
        onClick={onClick}
        className={cn("p-0 w-full h-full flex items-center hover:shadow-md", className)}
      >
        {children}
      </button>
    );
  }
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

/* ------------------------------------------------------------------ */
/*  ProductTable – pipeline: raw → filter → sort → paginate → render  */
/* ------------------------------------------------------------------ */
type Props = { products: Product[] };

export function ProductTable({ products }: Props) {
  const urlBack = useGenerateUrlBack("/stock/product");
  const [limit] = useLimit();
  const [page, setPage] = usePage();
  const [query] = useQuery();
  const [sortDir, setSortDir] = useSortDir();
  const [sortBy, setSortBy] = useSortBy();
  const [filters] = useFilters();

  /* ---- pipeline: search → losing → empty stock → price range → has note → updated ---- */
  const filtered = useMemo(() => {
    let result = products;

    // 1. search query
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.codes.some((c) => c.toLowerCase().includes(q)),
      );
    }

    // 2. losing money (any capital entry has capital >= price)
    if (filters.losing) {
      result = result.filter((p) =>
        p.capitals.some((cap) => cap.capital >= p.price),
      );
    }

    // 3. empty stock (any capital entry has stock <= 0)
    if (filters.emptyStock) {
      result = result.filter((p) =>
        p.capitals.some((cap) => cap.stock <= 0),
      );
    }

    // 4. price range
    if (filters.priceMin !== undefined) {
      result = result.filter((p) => p.price >= filters.priceMin!);
    }
    if (filters.priceMax !== undefined) {
      result = result.filter((p) => p.price <= filters.priceMax!);
    }

    // 5. has note
    if (filters.hasNote) {
      result = result.filter((p) => p.note.trim().length > 0);
    }

    // 6. recently updated
    if (filters.updatedWithin !== undefined) {
      const cutoff = Date.now() - filters.updatedWithin * 86_400_000;
      result = result.filter((p) => p.updatedAt >= cutoff);
    }

    return result;
  }, [products, query, filters]);

  /* ---- controlled state derived from URL params ---- */
  const sorting: SortingState = useMemo(
    () => [{ id: sortBy, desc: sortDir === "desc" }],
    [sortBy, sortDir],
  );

  const pagination: PaginationState = useMemo(
    () => ({ pageIndex: page - 1, pageSize: limit }),
    [page, limit],
  );

  /* ---- columns ---- */
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "no",
        header: "No",
        cell: (info) => info.row.index + 1,
        enableSorting: false,
      }),
      columnHelper.accessor("codes", {
        id: "code",
        header: "Kode",
        sortingFn: (a, b) => {
          const ca = a.original.codes[0] ?? "";
          const cb = b.original.codes[0] ?? "";
          return ca.localeCompare(cb);
        },
        cell: (info) => {
          const codes = info.getValue();
          return (
            <div className="flex flex-col gap-0.5 py-0.5">
              {codes.length === 0 ? (
                <span className="text-muted-foreground text-sm">-</span>
              ) : (
                codes.map((code, i) => (
                  <span key={i} className="text-center">
                    {code}
                  </span>
                ))
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("name", {
        header: "Nama",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("price", {
        header: "Harga",
        cell: (info) => (
          <span className="text-right block">{info.getValue().toLocaleString("id-ID")}</span>
        ),
      }),
      columnHelper.accessor("capitals", {
        id: "capitals",
        header: () => (
          <div className="flex gap-4 justify-end">
            <span>Modal</span>
            <span>Stok</span>
          </div>
        ),
        enableSorting: false,
        cell: (info) => {
          const capitals = info.getValue();
          return (
            <div className="flex flex-col gap-0.5 py-0.5">
              {capitals.length === 0 ? (
                <span className="text-muted-foreground text-sm">-</span>
              ) : (
                capitals.map((cap) => (
                  <div key={cap.id} className="flex gap-4 justify-end">
                    <span>{cap.capital.toLocaleString("id-ID")}</span>
                    <span>{cap.stock}</span>
                  </div>
                ))
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "action",
        header: "",
        cell: (info) => (
          <Button asChild variant="link" className="p-0 cursor-pointer">
            <Link
              to={{
                pathname: `./${info.row.original.id}`,
                search: `?url_back=${encodeURIComponent(urlBack)}`,
              }}
            >
              <SquareArrowOutUpRight className="icon" />
            </Link>
          </Button>
        ),
        enableSorting: false,
      }),
    ],
    [urlBack],
  );

  /* ---- table instance ---- */
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (next.length > 0) {
        setSortBy(next[0].id as ProductType.SortBy);
        setSortDir(next[0].desc ? "desc" : "asc");
      }
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      setPage(next.pageIndex + 1);
    },
  });

  /* ---- render ---- */
  return (
    <div className="flex-1 overflow-hidden min-h-0 w-full">
      <div className="flex flex-col h-full overflow-hidden">
        <Table className="text-normal">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "no" && "w-[50px]",
                      header.column.id === "code" && "w-[200px]",
                      header.column.id === "price" && "w-[120px]",
                      header.column.id === "capitals" && "w-[180px]",
                      header.column.id === "action" && "w-10",
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <SortBtn
                        sort={header.column.getIsSorted()}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </SortBtn>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* ---- Pagination ---- */}
        <div className="flex items-center justify-center gap-2 py-2 shrink-0 border-t">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums min-w-[3ch] text-center">
            {table.getState().pagination.pageIndex + 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
