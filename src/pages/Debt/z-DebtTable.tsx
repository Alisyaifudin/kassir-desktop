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
import { RecordDebt } from "~/database/record/get-debt";
import { formatDate } from "~/lib/date";
import { cn } from "~/lib/utils";
import { DebtSortBy, DebtSortDir, useSort } from "./use-sort";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function DebtTable({ records }: { records: RecordDebt[] }) {
  const [{ sortBy, sortDir }, setSort] = useSort();
  const urlBack = useGenerateUrlBack("/debt");
  const sortedRecords = useMemo(() => {
    const list = [...records];
    const sign = sortDir === "asc" ? 1 : -1;
    switch (sortBy) {
      case "paidAt":
        list.sort((a, b) => sign * (a.paidAt - b.paidAt));
        break;
      case "total":
        list.sort((a, b) => sign * (a.total - b.total));
        break;
    }
    return list;
  }, [records, sortBy, sortDir]);

  const onSort = (by: DebtSortBy) => () => {
    if (sortBy === by) {
      setSort(by, sortDir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(by, sortDir);
  };

  return (
    <Table className="text-normal " parentClass="rounded-md border ">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">No</TableHead>
          <TableHead className="w-[250px] small:w-[190px]">
            <SortBtn sort={sortBy === "paidAt" ? sortDir : undefined} onClick={onSort("paidAt")}>
              Tanggal
            </SortBtn>
          </TableHead>
          <TableHead>Catatan</TableHead>
          <TableHead className="w-[170px] text-right small:w-[150px]">
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
                    <ExternalLink />
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
  return (
    <button
      onClick={onClick}
      className={cn("p-0 w-full h-full flex justify-center items-center", className)}
    >
      <span>{children}</span>
      {sort ? (
        <span className="ml-1">
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
