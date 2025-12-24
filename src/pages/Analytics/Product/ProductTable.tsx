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
import { Item } from "~/database/product/get-by-range";
import { useSize } from "~/hooks/use-size";
import { cn } from "~/lib/utils";
import { useSort } from "./use-sort";
import { useCallback } from "react";
import { RawRow } from "./RawRow";
import { ProductRow } from "./ProductRow";
import { Show } from "~/components/Show";
import { useLimit } from "./use-limit";

const style = {
  small: {
    no: {
      width: "60px",
    },
    barcode: {
      width: "150px",
    },
    price: {
      width: "100px",
    },
    qty: {
      width: "40px",
    },
  },
  big: {
    no: {
      width: "60px",
    },
    barcode: {
      width: "150px",
    },
    price: {
      width: "100px",
    },
    qty: {
      width: "40px",
    },
  },
};

export function ProductTable({ items }: { items: Item[] }) {
  const size = useSize();
  const [limit, setLimit] = useLimit();
  const handleMore = () => {
    setLimit((prev) => {
      console.log("prev", prev);
      const limit = Math.min(prev + 100, items.length);
      console.log("now", limit);
      return limit;
    });
  };
  const navigate = useNavigate();
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
    [sortDir, sortBy]
  );
  const clickProduct = (id: number) => () => {
    navigate({
      pathname: `/stock/product/${id}`,
      search: `?url_back=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    });
  };
  const clickRecord = (timestamp: number) => () => {
    navigate({
      pathname: `/records/${timestamp}`,
      search: `?url_back=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    });
  };
  sortItems(items, sortBy, sortDir);
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead style={style[size].no}>No</TableHead>
          <TableHead style={style[size].barcode}>Barcode</TableHead>
          <TableHead>
            <SortBtn sort={sortBy === "name" ? sortDir : undefined} onClick={handleSort("name")}>
              Nama
            </SortBtn>
          </TableHead>
          <TableHead style={style[size].price} className="text-end">
            Harga
          </TableHead>
          <TableHead style={style[size].price} className="text-end">
            Modal
          </TableHead>
          <TableHead style={style[size].qty}>
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
              Menampilkan {limit} / {items.length} |{" "}
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
