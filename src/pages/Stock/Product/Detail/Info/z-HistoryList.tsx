import { useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { HistoryEvent } from "~/services/product/type";
import { formatEpochtime } from "~/lib/date";
import { cn, integer } from "~/lib/utils";
import { Show } from "~/components/Show";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "~/components/ui/pagination";

type FilterMode = "all" | "positive" | "negative";

const PAGE_SIZE = 20;

const FILTERS: FilterMode[] = ["all", "positive", "negative"];

function parseFilter(raw: string | null): FilterMode {
  return FILTERS.includes(raw as FilterMode) ? (raw as FilterMode) : "all";
}

type Props = {
  events: HistoryEvent[];
};

export function HistoryList({ events }: Props) {
  const [search, setSearch] = useSearchParams();

  const filter = parseFilter(search.get("filter"));
  const rawPage = integer.catch(1).parse(search.get("page"));
  const page = rawPage - 1; // 1-based in URL, 0-based internally

  const setFilter = useCallback(
    (mode: FilterMode) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        s.set("filter", mode);
        s.set("page", "1");
        return s;
      });
    },
    [setSearch],
  );

  const pageUrl = useCallback(
    (p: number) => `?${new URLSearchParams({ filter, page: String(p + 1) })}`,
    [filter],
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "positive":
        return events.filter((e) => e.value > 0);
      case "negative":
        return events.filter((e) => e.value < 0);
      default:
        return events;
    }
  }, [events, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <div className="flex rounded-md border border-input overflow-hidden">
          {(
            [
              ["all", "Semua"],
              ["positive", "Masuk"],
              ["negative", "Keluar"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors cursor-pointer",
                filter === mode
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Tidak ada riwayat</p>
        ) : (
          paged.map((event) => <HistoryCard key={event.id} event={event} />)
        )}
      </div>

      {totalPages > 1 && (
        <Pagination className="shrink-0 pt-1">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                to={pageUrl(safePage - 1)}
                aria-disabled={safePage === 0}
                className={safePage === 0 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink to={pageUrl(i)} isActive={i === safePage}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                to={pageUrl(safePage + 1)}
                aria-disabled={safePage >= totalPages - 1}
                className={safePage >= totalPages - 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function HistoryCard({ event }: { event: HistoryEvent }) {
  const isPositive = event.value > 0;
  const isNegative = event.value < 0;
  const formattedDate = formatEpochtime(event.timestamp, {
    date: "long",
    time: "short",
  });

  return (
    <div className="rounded-md border bg-card p-3 flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "font-semibold tabular-nums",
              isPositive && "text-green-600",
              isNegative && "text-red-600",
            )}
          >
            {isPositive ? "+" : ""}
            {event.value}
          </span>
          <Show value={event.record?.id}>
            {(recordId) => (
              <Link to={`/records/${recordId}`} className="text-xs text-primary hover:underline">
                Lihat transaksi
              </Link>
            )}
          </Show>
        </div>
        <Show value={event.record}>
          {(record) => (
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="tabular-nums">
                Modal: {new Intl.NumberFormat("id-ID").format(record.capital)}
              </span>
              <Show when={event.value > 0}>
                <span className="tabular-nums">
                  Harga:{" "}
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(record.price)}
                </span>
              </Show>
            </div>
          )}
        </Show>
        <p className="text-sm text-muted-foreground mt-0.5">{event.note}</p>
      </div>
      <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
        {formattedDate}
      </time>
    </div>
  );
}
