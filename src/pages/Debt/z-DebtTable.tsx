import { ArrowDownNarrowWide, ArrowDownWideNarrow, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDate } from "~/lib/date";
import { cn } from "~/lib/utils";
import type { DebtRecord } from "~/services/record";
import { DebtSortBy, DebtSortDir, useSort } from "./use-sort";
import { sortDebt } from "./util-debt";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function DebtTable({ records }: { records: DebtRecord[] }) {
  const [{ sortBy, sortDir }, setSort] = useSort();
  const urlBack = useGenerateUrlBack("/debt");
  const sortedRecords = useMemo(
    () => sortDebt(records, sortBy, sortDir),
    [records, sortBy, sortDir],
  );

  const onSort = (by: DebtSortBy) => () => {
    if (sortBy === by) {
      setSort(by, sortDir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(by, sortDir);
  };

  return (
    <Table className="text-base " parentClass="rounded-md border ">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">No</TableHead>
          <TableHead
            className="w-[300px]"
            aria-sort={sortBy === "paidAt" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
          >
            <SortBtn sort={sortBy === "paidAt" ? sortDir : undefined} onClick={onSort("paidAt")}>
              Tanggal
            </SortBtn>
          </TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead
            className="w-[170px] text-right"
            aria-sort={sortBy === "total" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
          >
            <SortBtn
              sort={sortBy === "total" ? sortDir : undefined}
              onClick={onSort("total")}
              className="justify-end"
            >
              Total
            </SortBtn>
          </TableHead>
          <TableHead className="w-[120px] text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="overflow-y-auto ">
        {sortedRecords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              Tidak ada data utang
            </TableCell>
          </TableRow>
        ) : (
          sortedRecords.map((record, i) => (
            <TableRow key={record.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="text-center">
                {formatDate(record.paidAt, "long").replaceAll("-", "/")}
              </TableCell>
              <TableCell className="max-w-[400px] truncate">{record.note}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(record.total, record.fix)}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="icon" variant="link">
                  <Link
                    to={{
                      pathname: `/records/${record.id}`,
                      search: `?tab=detail&url_back=${encodeURIComponent(urlBack)}`,
                    }}
                  >
                    <ExternalLink className="size-8" aria-label="Buka catatan" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
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
  sort?: DebtSortDir;
  onClick: () => void;
  className?: string;
}) {
  // Direction is announced both by the `<th aria-sort>` and by the button's own
  // name: as an unlabelled arrow, ascending and descending read identically.
  const direction = sort === undefined ? "" : sort === "asc" ? ", naik" : ", turun";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Urutkan menurut ${children}${direction}`}
      className={cn("p-0 w-full h-full flex justify-center items-center", className)}
    >
      <span>{children}</span>
      {sort ? (
        <span className="ml-1" aria-hidden="true">
          {sort === "desc" ? <ArrowDownWideNarrow /> : <ArrowDownNarrowWide />}
        </span>
      ) : null}
    </button>
  );
}

function formatCurrency(value: number, fix: number) {
  return `Rp${value.toLocaleString("id-ID", {
    minimumFractionDigits: fix,
    maximumFractionDigits: fix,
  })}`;
}
