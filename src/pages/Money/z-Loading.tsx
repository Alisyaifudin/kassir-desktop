import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

/** Pocket-card placeholders, shaped like the `/money` grid. */
export function CardsLoading() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton key={idx} className="h-20 w-full" />
      ))}
    </div>
  );
}

/** Whole-page fallback for the lazy `/money` route. */
export function Loading() {
  return (
    <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-36" />
      </div>
      <CardsLoading />
    </main>
  );
}

/** Ledger placeholder, shared by the history route and its in-page loader. */
export function TableLoading({ cols = 7 }: { cols?: number }) {
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-24" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 12 }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
