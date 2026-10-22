import { Link } from "react-router";
import { PackagePlus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useDayStart } from "~/hooks/use-day-start";
import { useUser } from "~/hooks/use-user";
import { formatDate, getDayName } from "~/lib/date";
import { capitalize } from "~/lib/utils";
import { withUrlBack } from "./format";

/**
 * Who is on the till, what day it is, and the two things a person at the counter
 * actually starts with. No 48px greeting: the topbar already carries the page
 * title, so this is a working header, not a title slide.
 *
 * The date is read off `useDayStart`, so a window left open past midnight stops
 * calling yesterday "today" here too.
 */
export function Header() {
  const user = useUser();
  const dayStart = useDayStart();

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col">
        <p className="text-normal font-semibold tracking-tight break-words">
          Selamat datang, {capitalize(user.name)}
        </p>
        <p className="text-small text-muted-foreground">
          {getDayName(dayStart)}, {formatDate(dayStart, "long")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link to={withUrlBack("/restock")}>
            <PackagePlus aria-hidden="true" />
            Catat pembelian
          </Link>
        </Button>
        <Button asChild className="bg-active text-active-foreground hover:bg-active/90">
          <Link to={withUrlBack("/pos")}>
            <Plus aria-hidden="true" />
            Transaksi Baru
          </Link>
        </Button>
      </div>
    </header>
  );
}
