import { Skeleton } from "~/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "~/components/ui/table";

export function Loading() {
  return (
    <TableBody>
      {Array.from({ length: 20 }).map((_, i) => (
        <TableRow key={i} className="h-11">
          <TableCell colSpan={5} className="py-0">
            <Skeleton className="h-8" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
