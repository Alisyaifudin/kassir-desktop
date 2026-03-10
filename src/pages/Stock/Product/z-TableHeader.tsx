import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { TableHead, TableHeader as TableHeaderRoot, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { useSortBy } from "./use-sort-by";
import { useSortDir } from "./use-sort-dir";
import { useCallback } from "react";

export function TableHeader() {
  const [sortBy, setSortBy] = useSortBy();
  const [sortDir, setSortDir] = useSortDir();
  const handleSort = useCallback(
    (sort: "name" | "barcode" | "stock" | "price" | "capital") => () => {
      if (sort === sortBy) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
        return;
      }
      setSortBy(sort);
    },
    [sortDir, sortBy],
  );
  return (
    <TableHeaderRoot>
      <TableRow>
        <TableHead className="w-[50px] small:w-[40px]">No</TableHead>
        <TableHead className="w-[230px] small:w-[150px]">
          <SortBtn
            onClick={handleSort("barcode")}
            sort={sortBy === "barcode" ? sortDir : undefined}
            className="justify-center"
          >
            Kode
          </SortBtn>
        </TableHead>
        <TableHead>
          <SortBtn
            onClick={handleSort("name")}
            sort={sortBy === "name" ? sortDir : undefined}
            className="justify-start"
          >
            Nama
          </SortBtn>
        </TableHead>
        <TableHead className="w-[120px] small:w-[80px]">
          <SortBtn
            onClick={handleSort("price")}
            sort={sortBy === "price" ? sortDir : undefined}
            className="justify-end"
          >
            Harga
          </SortBtn>
        </TableHead>
        <TableHead className="w-[120px] small:w-[80px]">
          <SortBtn
            onClick={handleSort("capital")}
            sort={sortBy === "capital" ? sortDir : undefined}
            className="justify-end"
          >
            Modal
          </SortBtn>
        </TableHead>
        <TableHead className="w-[60px] small:w-[43px]">
          <SortBtn
            onClick={handleSort("stock")}
            sort={sortBy === "stock" ? sortDir : undefined}
            className="justify-center"
          >
            Stok
          </SortBtn>
        </TableHead>
        <TableHead className="w-10"></TableHead>
      </TableRow>
    </TableHeaderRoot>
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
