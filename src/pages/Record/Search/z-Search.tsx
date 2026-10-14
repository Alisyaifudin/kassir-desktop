import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { SearchIcon, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/Loader";
import { Show } from "~/components/Show";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDate, formatTime } from "~/lib/date";
import { cn } from "~/lib/utils";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import type { ListingHistoryPage } from "~/services/record";
import { useQuery } from "../use-query";
import { RecordsErrorBoundary, RecordsErrorFallback } from "../z-Error";
import { useData } from "./use-data";
import { ModeSelect } from "./z-ModeSelect";

/** Rows fetched per page; "Lebih banyak" asks the service for the next slice. */
const PAGE = 100;

export function Search() {
  const [query, setQuery] = useQuery();
  const [limit, setLimit] = useState(PAGE);
  const ref = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formdata = new FormData(event.currentTarget);
    setQuery((formdata.get("query") as string | null) ?? "");
  }

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <form className="flex flex-1 items-center py-0.5 gap-2" onSubmit={handleSubmit}>
          <Button className="icon" variant="ghost">
            <SearchIcon />
          </Button>
          <Input
            ref={ref}
            aria-autocomplete="list"
            placeholder="Cari"
            name="query"
            defaultValue={query}
            type="search"
          />
        </form>
        <ModeSelect />
      </div>
      <Output limit={limit} onMore={() => setLimit((current) => current + PAGE)} />
    </div>
  );
}

function Output({ limit, onMore }: { limit: number; onMore: () => void }) {
  const res = useData(limit);
  return (
    <RecordsErrorBoundary fallback={RecordsErrorFallback}>
      <Loader res={res} fallback={<LoadingTable />}>
        {({ data }) => (
          <output className="flex-1 overflow-hidden">
            <div className="max-h-full overflow-hidden flex">
              <SearchTable page={data} onMore={onMore} />
            </div>
          </output>
        )}
      </Loader>
    </RecordsErrorBoundary>
  );
}

function SearchTable({ page, onMore }: { page: ListingHistoryPage; onMore: () => void }) {
  const navigate = useNavigate();
  const urlBack = useGenerateUrlBack("/records/search");

  function handleClick(id: string) {
    return function () {
      navigate({
        pathname: `/records/${id}`,
        search: `?url_back=${encodeURIComponent(urlBack)}`,
      });
    };
  }

  return (
    <Table className="text-normal flex-1">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px] font-normal small:w-[50px]">No</TableHead>
          <TableHead className="text-center w-[170px] font-normal small:w-[110px]">
            Tanggal
          </TableHead>
          <TableHead className="text-center w-[100px] font-normal small:w-[80px]">Waktu</TableHead>
          <TableHead className="font-normal">Nama</TableHead>
          <TableHead className="text-center w-[57px] font-normal small:w-[50px]">Qty</TableHead>
          <TableHead className="text-end w-[120px] font-normal">Harga</TableHead>
          <TableHead className="icon" />
        </TableRow>
      </TableHeader>
      <TableBody className="overflow-auto flex-1 w-full">
        <ForEachRow page={page} onClick={handleClick} />
        <Show when={page.entries.length < page.total}>
          <TableRow>
            <TableCell colSpan={7} className="text-end">
              Menampilkan {page.entries.length} / {page.total} |{" "}
              <button className="underline" onClick={onMore}>
                Lebih banyak
              </button>
            </TableCell>
          </TableRow>
        </Show>
      </TableBody>
    </Table>
  );
}

function ForEachRow({
  page,
  onClick,
}: {
  page: ListingHistoryPage;
  onClick: (id: string) => () => void;
}) {
  if (page.total === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
          Tidak ada yang cocok.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {page.entries.map((entry, index) => (
        <TableRow key={entry.id} className={cn({ "bg-blue-50/50": index % 2 === 0 })}>
          <TableCell>{index + 1}</TableCell>
          <TableCell className="text-center">
            {formatDate(entry.paidAt).replaceAll("-", "/")}
          </TableCell>
          <TableCell className="text-center">{formatTime(entry.paidAt)}</TableCell>
          <TableCell>{entry.name}</TableCell>
          <TableCell className="text-center">{entry.qty}</TableCell>
          <TableCell className="text-right">{entry.price.toLocaleString("id-ID")}</TableCell>
          <TableCell>
            <Button
              onClick={onClick(entry.recordId)}
              variant="link"
              className="p-0 cursor-pointer"
            >
              <SquareArrowOutUpRight className="icon" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function LoadingTable() {
  return (
    <output className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <Table className="text-normal flex-1">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] font-normal small:w-[50px]">No</TableHead>
              <TableHead className="text-center w-[170px] font-normal small:w-[110px]">
                Tanggal
              </TableHead>
              <TableHead className="text-center w-[100px] font-normal small:w-[80px]">
                Waktu
              </TableHead>
              <TableHead className="font-normal">Nama</TableHead>
              <TableHead className="text-center w-[57px] font-normal small:w-[50px]">Qty</TableHead>
              <TableHead className="text-end w-[120px] font-normal">Harga</TableHead>
              <TableHead className="icon" />
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-auto flex-1 w-full">
            {Array.from({ length: 12 }).map((_, i) => (
              <TableRow key={i} className={cn({ "bg-blue-50/50": i % 2 === 0 })}>
                <TableCell>
                  <Skeleton className="h-4 w-6" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-24 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-16 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </output>
  );
}
