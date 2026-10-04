import { DateRange } from "~/components/DateRange";
import { Loader } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { useId } from "../use-id";
import { ListingChart, ProfitChart, QtyChart, RevenueChart, StockChart } from "./z-Charts";
import { Summary } from "./z-Summary";
import {
  aggregate,
  byListing,
  stockSeries,
  totals,
  usePerformance,
  usePerformanceRange,
  type Interval,
} from "./use-performance";

const INTERVALS: { id: Interval; label: string }[] = [
  { id: "day", label: "Hari" },
  { id: "week", label: "Minggu" },
  { id: "month", label: "Bulan" },
];

export default function Page() {
  const id = useId();
  const { from, to, interval, setRange, setInterval } = usePerformanceRange();
  const res = usePerformance(id, from, to);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DateRange range={[from, to]} setRange={setRange} />
        <div className="inline-flex rounded-md border p-0.5 text-normal">
          {INTERVALS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "rounded px-2.5 py-1 transition-colors",
                interval === item.id ? "bg-muted font-medium" : "text-muted-foreground",
              )}
              onClick={() => setInterval(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Loader res={res} fallback={<Loading />}>
        {({ data }) => {
          const bins = aggregate(data.sales, from, to, interval);
          const listing = byListing(data.sales);
          const stock = stockSeries(data, from, to, interval);
          return (
            <>
              <Summary totals={totals(data)} />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <QtyChart data={bins} />
                <RevenueChart data={bins} />
                <ProfitChart data={bins} />
                <StockChart data={stock} />
                {listing.length > 0 ? <ListingChart data={listing} /> : null}
              </div>
            </>
          );
        }}
      </Loader>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
