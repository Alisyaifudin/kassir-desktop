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
export function TableLoading({ cols = 7 }: { cols?: number }) {
  return (
    <Table className="text-base">
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

/** The history header: the pocket's name and its two controls. */
export function HeaderLoading() {
  return (
    <div className="flex items-center justify-between" aria-busy="true" aria-label="Memuat kantong">
      <Skeleton className="h-10 w-56" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="size-10" />
      </div>
    </div>
  );
}
