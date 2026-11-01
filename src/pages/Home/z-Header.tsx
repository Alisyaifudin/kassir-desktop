import { Link } from "~/services/route/react";
import { PackagePlus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useUser } from "~/hooks/use-user";
import { formatDate, getDayName } from "~/lib/date";
import { capitalize } from "~/lib/utils";

/**
 * Who is on the till, what day it is, and the two things a person at the counter
 * actually starts with. No hero-sized greeting: the topbar already carries the page
 * title, so this is a working header, not a title slide.
 *
 * Entirely static: the user comes from the authenticated layout's own gate, and
 * the day boundary is passed down from the page, which already reads it for its
 * sources — so the date is right after midnight without a second timer.
 */
export function Header({ dayStart }: { dayStart: number }) {
  const user = useUser();

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col">
        <p className="text-2xl font-semibold tracking-tight break-words">
          Selamat datang, {capitalize(user.name)}
        </p>
        <p className="text-sm text-muted-foreground">
          {getDayName(dayStart)}, {formatDate(dayStart, "long")}
        </p>
      </div>
      {/* Both buttons open a section, not a step: `Back` from either belongs on
          Beranda — the stack's root, which is where this page already is. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link to="/restock" behavior="root">
            <PackagePlus aria-hidden="true" />
            Catat pembelian
          </Link>
        </Button>
        <Button asChild className="bg-active text-active-foreground hover:bg-active/90">
          <Link to="/pos" behavior="root">
            <Plus aria-hidden="true" />
            Transaksi Baru
          </Link>
        </Button>
      </div>
    </header>
  );
}
