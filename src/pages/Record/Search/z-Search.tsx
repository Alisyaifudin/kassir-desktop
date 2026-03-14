import { Input } from "~/components/ui/input";
import { useQuery } from "./use-query";
import { cn } from "~/lib/utils";
import { RecordProduct } from "~/database/record-product/get-history";
import { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { SearchIcon, SquareArrowOutUpRight } from "lucide-react";
import { useNavigate } from "react-router";
import { Show } from "~/components/Show";
import { ModeSelect } from "./z-ModeSelect";
import { useMode } from "./use-mode";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { formatDate, formatTime } from "~/lib/date";
import { Skeleton } from "~/components/ui/skeleton";

export function Search() {
  const [query, setQuery] = useQuery();
  const ref = useRef<HTMLInputElement>(null);
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formdata = new FormData(e.currentTarget);
    const query = formdata.get("query") as string;
    setQuery(query);
  }
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.focus();
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
      <Output />
    </div>
  );
}

function Output() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingTable />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(histories) {
      return (
        <output className="flex-1 overflow-hidden">
          <div className="max-h-full overflow-hidden flex">
            <SearchTable histories={histories} />
          </div>
        </output>
      );
    },
  });
}

function SearchTable({ histories }: { histories: RecordProduct[] }) {
  const [limit, setLimit] = useState(100);
  const navigate = useNavigate();
  function handleClick(timestamp: number) {
    return function () {
      const urlBack = encodeURIComponent(window.location.href);
      navigate({ pathname: `/records/${timestamp}`, search: `?url_back=${urlBack}` });
    };
  }
  const [mode] = useMode();
  const filtered = histories.filter((h) => h.mode === mode);
  const handleMore = () => {
    setLimit((prev) => {
      const limit = Math.min(prev + 100, filtered.length);
      return limit;
    });
  };
  return (
    <Table className="text-normal flex-1">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px] small:w-[50px]">No</TableHead>
          <TableHead className="text-center w-[170px] small:w-[110px]">Tanggal</TableHead>
          <TableHead className="text-center w-[100px] small:w-[80px]">Waktu</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-center w-[57px] small:w-[50px]">Qty</TableHead>
          <TableHead className="text-end w-[120px]">Harga</TableHead>
          <TableHead className="icon"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="overflow-auto flex-1 w-full">
        {filtered.slice(0, limit).map((history, i) => (
          <TableRow key={i} className={cn({ "bg-blue-50/50": i % 2 == 0 })}>
            <TableCell>{i + 1}</TableCell>
            <TableCell className="text-center">
              {formatDate(history.timestamp).replaceAll("-", "/")}
            </TableCell>
            <TableCell className="text-center">{formatTime(history.timestamp)}</TableCell>
            <TableCell>{history.name}</TableCell>
            <TableCell className="text-center">{history.qty}</TableCell>
            <TableCell className="text-right">{history.price.toLocaleString("id-ID")}</TableCell>
            <TableCell>
              <Button
                onClick={handleClick(history.timestamp)}
                variant="link"
                className="p-0 cursor-pointer"
              >
                <SquareArrowOutUpRight className="icon" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        <Show when={limit < filtered.length}>
          <TableRow>
            <TableCell colSpan={7} className="text-end">
              Menampilkan {limit} / {filtered.length} |{" "}
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

function LoadingTable() {
  return (
    <output className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <Table className="text-normal flex-1">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] small:w-[50px]">No</TableHead>
              <TableHead className="text-center w-[170px] small:w-[110px]">Tanggal</TableHead>
              <TableHead className="text-center w-[100px] small:w-[80px]">Waktu</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="text-center w-[57px] small:w-[50px]">Qty</TableHead>
              <TableHead className="text-end w-[120px]">Harga</TableHead>
              <TableHead className="icon"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-auto flex-1 w-full">
            {Array.from({ length: 12 }).map((_, i) => (
              <TableRow key={i} className={cn({ "bg-blue-50/50": i % 2 == 0 })}>
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
