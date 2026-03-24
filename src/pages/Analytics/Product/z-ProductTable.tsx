import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Item } from "~/database/product/get-all-by-range";
import { cn } from "~/lib/utils";
import { useSort } from "./use-sort";
import { useCallback } from "react";
import { RawRow } from "./z-RawRow";
import { ProductRow } from "./z-ProductRow";
import { Show } from "~/components/Show";
import { useLimit } from "./use-limit";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function ProductTable({ items }: { items: Item[] }) {
  const [limit, setLimit] = useLimit();
  const handleMore = () => {
    setLimit((prev) => {
      const limit = Math.min(prev + 100, items.length);
      return limit;
    });
  };
  const navigate = useNavigate();
  const urlBack = useGenerateUrlBack(`/analytics/products`);
  const [sort, setSort] = useSort();
  const { sortBy, sortDir } = sort;
  const handleSort = useCallback(
    (by: "name" | "qty") => () => {
      if (by === sortBy) {
        setSort(by, sortDir === "asc" ? "desc" : "asc");
        return;
      }
      setSort(by, sortDir);
    },
    [sortDir, sortBy, setSort],
  );
  const clickProduct = (id: number) => () => {
    navigate({
      pathname: `/stock/product/${id}`,
      search: `?url_back=${encodeURIComponent(urlBack)}`,
    });
  };
  const clickRecord = (timestamp: number) => () => {
    navigate({
      pathname: `/records/${timestamp}`,
      search: `?url_back=${encodeURIComponent(urlBack)}`,
    });
  };
  sortItems(items, sortBy, sortDir);
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">No</TableHead>
          <TableHead className="w-[219px] small:w-[150px]">Barcode</TableHead>
          <TableHead>
            <SortBtn sort={sortBy === "name" ? sortDir : undefined} onClick={handleSort("name")}>
              Nama
            </SortBtn>
          </TableHead>
          <TableHead className="text-end w-[120px] small:w-[90px]">Harga</TableHead>
          <TableHead className="text-end w-[120px] small:w-[90px]">Modal</TableHead>
          <TableHead className="w-[57px] small:w-[40px]">
            <SortBtn sort={sortBy === "qty" ? sortDir : undefined} onClick={handleSort("qty")}>
              Qty
            </SortBtn>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.slice(0, limit).map((item, i) => {
          if (item.kind === "raw") {
            return <RawRow item={item} i={i} clickRecord={clickRecord} key={i} />;
          }
          if (item.items.length === 0) return null;
          return (
            <ProductRow
              item={item}
              clickProduct={clickProduct}
              clickRecord={clickRecord}
              i={i}
              key={i}
            />
          );
        })}
        <Show when={limit < items.length}>
          <TableRow>
            <TableCell colSpan={6} className="text-end">
              Menampilkan {limit} / {items.length || 1} |{" "}
              <button className="underline" onClick={handleMore}>
                Lebih banyak
              </button>
            </TableCell>
          </TableRow>
        </Show>
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

function sortItems(items: Item[], by: "name" | "qty", dir: "asc" | "desc") {
  switch (by) {
    case "name": {
      if (dir === "asc") {
        items.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        items.sort((a, b) => b.name.localeCompare(a.name));
      }
      break;
    }
    case "qty": {
      if (dir === "asc") {
        items.sort((a, b) => a.qty - b.qty);
      } else {
        items.sort((a, b) => b.qty - a.qty);
      }
      break;
    }
  }
}
