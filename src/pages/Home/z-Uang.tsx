import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import type { PocketSummary } from "~/services/money";
import { pageData } from "./data";
import { formatMoney, withUrlBack } from "./format";
import { Card, CardHead, CardLink } from "./z-Card";
import { RegionError } from "./z-Error";

/** Five pockets fit the rail; the rest stay one link away on /money. */
const VISIBLE = 5;

/**
 * Same floor as the ledger: the list area is reserved from the first frame, so
 * `Gate` can hold the skeleton back 200 ms (no flash on a fast read) and the
 * card still keeps its height between the first paint and the first balance.
 * Four rows, big or small — a shape to tune here, not a measurement.
 */
const ROWS_FLOOR = "min-h-[208px] small:min-h-[192px]";
/** One placeholder line, the height of a real pocket row at either app size. */
const SKELETON_ROW =
  "flex min-h-[52px] small:min-h-[48px] items-center justify-between gap-3 px-4";

/**
 * The money card: what each pocket holds right now. Rendered only for admins
 * (`/money` redirects cashiers), and deliberately without a summed total — the
 * pocket catalog is the shop's own, and adding an "Utang"-style ledger pocket to
 * a cash total would be a number nobody wrote down.
 *
 * `pockets` is another service and another key, so this card loads beside the
 * day rather than after it, and a pocket failure cannot touch the ledger.
 */
export function Uang() {
  return (
    <Card>
      <CardHead title="Uang" action={<CardLink to={withUrlBack("/money")}>Kelola</CardLink>} />
      <div className={cn("flex flex-col", ROWS_FLOOR)}>
        <pageData.Gate
          keys={["pockets"]}
          pulse={<UangSkeleton />}
          error={(error) => (
            <div className="p-3">
              <RegionError title="Gagal memuat uang" error={error} />
            </div>
          )}
        >
          {({ pockets }) => <Pockets pockets={pockets} />}
        </pageData.Gate>
      </div>
    </Card>
  );
}

function Pockets({ pockets }: { pockets: PocketSummary[] }) {
  const shown = pockets.slice(0, VISIBLE);
  const rest = pockets.length - shown.length;

  if (shown.length === 0) {
    return (
      <p className="px-4 py-6 text-small text-muted-foreground">Belum ada kantong uang.</p>
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y">
        {shown.map((item) => (
          <li
            key={item.pocket.id}
            className="flex items-baseline justify-between gap-3 px-4 py-2.5"
          >
            <span className="min-w-0 truncate text-small text-muted-foreground">
              {item.pocket.name}
            </span>
            <span className="shrink-0 text-small font-semibold tabular-nums">
              {item.latest === null ? (
                <span className="font-normal text-muted-foreground">Masih kosong</span>
              ) : (
                formatMoney(item.latest.value)
              )}
            </span>
          </li>
        ))}
      </ul>
      {rest > 0 ? (
        <p className="border-t px-4 py-2 text-small text-muted-foreground">
          {rest} kantong lain di Uang
        </p>
      ) : null}
    </>
  );
}

function UangSkeleton() {
  return (
    <div className="flex flex-col divide-y" aria-busy="true" aria-label="Memuat kantong">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={SKELETON_ROW}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}
