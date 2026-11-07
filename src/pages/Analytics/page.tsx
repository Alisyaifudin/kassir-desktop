import { Suspense } from "react";
import { Outlet } from "react-router";
import { useLocation } from "~/services/route/react";
import { RangeBar } from "./z-RangeBar";
import { Rail } from "./z-Rail";
import { AnalyticsBodyLoading } from "./z-Loading";

/**
 * Analytics is a rail of six questions over one period. The period and the
 * bucket width live in the URL and in the header, so switching pages never
 * resets what you were looking at, and a link can carry the range.
 */
export default function Page() {
  const path = useLocation().pathname.replace(/\/$/, "");
  // Waktu reads one week at a time; Pembayaran and Jaringan have no time series,
  // so the bucket width would be a control with nothing behind it. Produk and
  // Jaringan include the `today` preset for same-day product questions.
  const week = path.endsWith("/time");
  const network = path.endsWith("/network");
  const noSeries = week || network || path.endsWith("/payments");
  const mode = week ? "week" : path.endsWith("/products") || network ? "product" : "date";

  return (
    <main className="flex h-full min-h-0 overflow-hidden">
      <aside className="w-[280px] shrink-0 border-r p-2">
        <Rail />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex-none border-b p-2">
          <RangeBar mode={mode} showInterval={!noSeries} />
        </header>
        <div
          className={
            network ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto p-2"
          }
        >
          {/* The bodies are the chart chunk; the rail and the period above it are
              static, so only this box is allowed to be empty for a moment. */}
          <Suspense fallback={<AnalyticsBodyLoading />}>
            <Outlet />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
