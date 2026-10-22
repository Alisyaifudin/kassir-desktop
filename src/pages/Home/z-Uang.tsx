import { Loader } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { formatMoney, withUrlBack } from "./format";
import { usePockets } from "./use-pockets";
import { Card, CardHead, CardLink } from "./z-Card";
import { PocketsError, PocketsErrorBoundary } from "./z-Error";

/** Five pockets fit the rail; the rest stay one link away on /money. */
const VISIBLE = 5;

/**
 * The money card: what each pocket holds right now. Rendered only for admins
 * (`/money` redirects cashiers), and deliberately without a summed total — the
 * pocket catalog is the shop's own, and adding an "Utang"-style ledger pocket to
 * a cash total would be a number nobody wrote down.
 */
export function Uang() {
  const res = usePockets();

  return (
    <Card>
      <CardHead title="Uang" action={<CardLink to={withUrlBack("/money")}>Kelola</CardLink>} />
      <PocketsErrorBoundary fallback={PocketsError}>
        <Loader res={res} fallback={<UangLoading />}>
          {({ data }) => {
            const shown = data.slice(0, VISIBLE);
            const rest = data.length - shown.length;

            if (shown.length === 0) {
              return (
                <p className="px-4 py-6 text-small text-muted-foreground">
                  Belum ada kantong uang.
                </p>
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
          }}
        </Loader>
      </PocketsErrorBoundary>
    </Card>
  );
}

function UangLoading() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}
