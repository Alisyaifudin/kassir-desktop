import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router";
import { SearchIcon, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { pageData } from "./data";
import { resultsSource } from "./source";
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
import { useMode } from "../use-mode";
import { useQuery } from "../use-query";
import { RecordsErrorFallback } from "../z-Error";
import { useRange } from "./use-range";
import { ModeSelect } from "./z-ModeSelect";

/** Rows fetched per page; "Lebih banyak" asks the service for the next slice. */
const PAGE = 100;

export function Search() {
  const [query, setQuery] = useQuery();
  const [mode] = useMode();
  const { start, endExclusive } = useRange();
  const ref = useRef<HTMLInputElement>(null);

  // "Lebih banyak" is an instruction about the result set it was pressed on, not
  // about the session: one expansion used to raise the page size for every later
  // search, so each keypress re-queried and re-rendered 200, then 300 rows. The
  // key is what the expansion belongs to; a new query/filter/range falls back to
  // one page without an effect (and so without a second, oversized request).
  const scope = `${query}|${mode}|${start}|${endExclusive}`;
  const [expanded, setExpanded] = useState<{ scope: string; limit: number }>({
    scope,
    limit: PAGE,
  });
  const limit = expanded.scope === scope ? expanded.limit : PAGE;

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
          <Button className="icon" variant="ghost" aria-label="Cari transaksi" type="submit">
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
      <Results
        limit={limit}
        // Remounting the table on a new result set is also what resets its
        // roving cursor: `focused` survived a new query, so Tab landed mid-list.
        tableKey={scope}
        onMore={() => setExpanded({ scope, limit: limit + PAGE })}
      />
    </div>
  );
}

/**
 * The result pane. A plain `div`, deliberately: this used to be `<output>`,
 * which maps to ARIA `role="status"` — an atomic polite live region — so every
 * keystroke that re-queried and every "Lebih banyak" append made a screen
 * reader read up to 100 rows × 7 cells aloud. What is worth announcing is the
 * count, which `SearchTable` now carries in its own small `role="status"`.
 */
function Results({
  limit,
  tableKey,
  onMore,
}: {
  limit: number;
  tableKey: string;
  onMore: () => void;
}) {
  // The search's four inputs are URL values and one local counter, so they are
  // the registry's `deps`: typing a new term keeps the previous rows on screen
  // (flagged) instead of blanking them between keystrokes.
  const { start, endExclusive } = useRange();
  const [mode] = useMode();
  const [query] = useQuery();

  const sources = useMemo(
    () => ({ results: resultsSource({ start, end: endExclusive, mode, query, limit }) }),
    [start, endExclusive, mode, query, limit],
  );

  return (
    <pageData.Provider sources={sources} deps={[start, endExclusive, mode, query, limit]}>
      <pageData.Gate
        keys={["results"]}
        pulse={<LoadingTable />}
        error={(error) => <RecordsErrorFallback error={error} />}
      >
        {({ results }) => (
          <div className="flex-1 overflow-hidden">
            <div className="max-h-full overflow-hidden flex">
              <SearchTable key={tableKey} page={results} onMore={onMore} />
            </div>
          </div>
        )}
      </pageData.Gate>
    </pageData.Provider>
  );
}

function SearchTable({ page, onMore }: { page: ListingHistoryPage; onMore: () => void }) {
  const navigate = useNavigate();
  const urlBack = useGenerateUrlBack("/records/search");
  // Roving tabindex, the same model the day list and the POS grids use: the
  // result list is one tab stop, arrows move inside it, Enter opens the record.
  // Before this, the only focusable thing per row was an unnamed icon button, so
  // a keyboard user could search and then not open anything.
  const [focused, setFocused] = useState(0);
  const tabStop = Math.min(focused, Math.max(0, page.entries.length - 1));

  const open = useCallback(
    (id: string) => {
      navigate({
        pathname: `/records/${id}`,
        search: `?url_back=${encodeURIComponent(urlBack)}`,
      });
    },
    [navigate, urlBack],
  );

  return (
    <>
      {/* One short sentence, announced once per result change — never the rows. */}
      <p role="status" className="sr-only">
        {page.total === 0
          ? "Tidak ada yang cocok."
          : `Menampilkan ${page.entries.length} dari ${page.total} hasil.`}
      </p>
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
          <ForEachRow page={page} tabStop={tabStop} onFocusRow={setFocused} onOpen={open} />
          <Show when={page.entries.length < page.total}>
            <TableRow>
              <TableCell colSpan={7} className="text-end">
                Menampilkan {page.entries.length} / {page.total} |{" "}
                <button
                  className="underline"
                  aria-label="Muat hasil berikutnya"
                  onClick={onMore}
                >
                  Lebih banyak
                </button>
              </TableCell>
            </TableRow>
          </Show>
        </TableBody>
      </Table>
    </>
  );
}

function ForEachRow({
  page,
  tabStop,
  onFocusRow,
  onOpen,
}: {
  page: ListingHistoryPage;
  /** The row that carries the list's single tab stop. */
  tabStop: number;
  onFocusRow: (index: number) => void;
  onOpen: (id: string) => void;
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

  /** Enter/Space opens the row under the cursor; arrows move the cursor. */
  function handleKeyDown(index: number, recordId: string) {
    return (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen(recordId);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const rows = event.currentTarget
        .closest("tbody")
        ?.querySelectorAll<HTMLTableRowElement>("tr[tabindex]");
      if (rows === undefined || rows.length === 0) return;
      const last = rows.length - 1;
      const target =
        event.key === "ArrowDown"
          ? index + 1
          : event.key === "ArrowUp"
            ? index - 1
            : event.key === "Home"
              ? 0
              : last;
      const next = Math.min(Math.max(target, 0), last);
      onFocusRow(next);
      rows[next]?.focus();
    };
  }

  return (
    <>
      {page.entries.map((entry, index) => (
        <TableRow
          key={entry.id}
          tabIndex={index === tabStop ? 0 : -1}
          aria-label={`${formatDate(entry.paidAt)} ${entry.name}`}
          onClick={() => onOpen(entry.recordId)}
          onKeyDown={handleKeyDown(index, entry.recordId)}
          className={cn(
            "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:outline-none",
            { "bg-muted/50": index % 2 === 0 },
          )}
        >
          <TableCell>{index + 1}</TableCell>
          <TableCell className="text-center">
            {formatDate(entry.paidAt).replaceAll("-", "/")}
          </TableCell>
          <TableCell className="text-center">{formatTime(entry.paidAt)}</TableCell>
          <TableCell>{entry.name}</TableCell>
          <TableCell className="text-center">{entry.qty}</TableCell>
          <TableCell className="text-right">{entry.price.toLocaleString("id-ID")}</TableCell>
          <TableCell>
            {/* The row is the control now; the icon is a hint, not a button. */}
            <SquareArrowOutUpRight className="icon text-muted-foreground" aria-hidden="true" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function LoadingTable() {
  return (
    <div className="flex-1 overflow-hidden">
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
              <TableRow key={i} className={cn({ "bg-muted/50": i % 2 === 0 })}>
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
    </div>
  );
}
