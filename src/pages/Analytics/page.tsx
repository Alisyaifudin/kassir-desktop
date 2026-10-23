import { Outlet, useLocation } from "react-router";
import { RangeBar } from "./z-RangeBar";
import { Rail } from "./z-Rail";

/**
 * Analytics is a rail of five questions over one period. The period and the
 * bucket width live in the URL and in the header, so switching pages never
 * resets what you were looking at, and a link can carry the range.
 */
export default function Page() {
  const path = useLocation().pathname.replace(/\/$/, "");
  // Waktu reads one week at a time; Pembayaran plots no time series, so the
  // bucket width would be a control with nothing behind it.
  const week = path.endsWith("/waktu");
  const noSeries = week || path.endsWith("/pembayaran");

  return (
    <main className="flex h-full min-h-0 overflow-hidden">
      <aside className="w-[280px] shrink-0 border-r p-2 small:w-[220px]">
        <Rail />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex-none border-b p-2">
          <RangeBar mode={week ? "week" : "date"} showInterval={!noSeries} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
