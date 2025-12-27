import { Input } from "~/components/ui/input";
import { useQuery } from "./use-query";
import { cn, DefaultError, formatDate, formatTime, Result } from "~/lib/utils";
import { RecordProduct } from "~/database/record-product/get-history";
import { Suspense, use, useEffect, useRef, useState } from "react";
import { TextError } from "~/components/TextError";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useSize } from "~/hooks/use-size";
import { Button } from "~/components/ui/button";
import { SearchIcon, SquareArrowOutUpRight } from "lucide-react";
import { useNavigate } from "react-router";
import { Show } from "~/components/Show";
import { LoadingBig } from "~/components/Loading";
import { ModeSelect } from "./ModeSelect";
import { useMode } from "./use-mode";

export function Search({
  histories,
}: {
  histories: Promise<Result<DefaultError, RecordProduct[]>>;
}) {
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
      <Output histories={histories} />
    </div>
  );
}

function Output({
  histories: promise,
}: {
  histories: Promise<Result<DefaultError, RecordProduct[]>>;
}) {
  const [errMsg, histories] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return (
    <output className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <Suspense fallback={<LoadingBig />}>
          <SearchTable histories={histories} />
        </Suspense>
      </div>
    </output>
  );
}

const width = {
  small: {
    no: {
      width: "50px",
    },
    date: {
      width: "110px",
    },
    time: {
      width: "80px",
    },
    qty: {
      width: "50px",
    },
    price: {
      width: "120px",
    },
  },
  big: {
    no: {
      width: "60px",
    },
    date: {
      width: "170px",
    },
    time: {
      width: "100px",
    },
    qty: {
      width: "57px",
    },
    price: {
      width: "120px",
    },
  },
};

function SearchTable({ histories }: { histories: RecordProduct[] }) {
  const [limit, setLimit] = useState(100);
  const size = useSize();
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
          <TableHead style={width[size].no}>No</TableHead>
          <TableHead style={width[size].date} className="text-center">
            Tanggal
          </TableHead>
          <TableHead style={width[size].time} className="text-center">
            Waktu
          </TableHead>
          <TableHead>Nama</TableHead>
          <TableHead style={width[size].qty} className="text-center">
            Qty
          </TableHead>
          <TableHead style={width[size].price} className="text-end">
            Harga
          </TableHead>
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
