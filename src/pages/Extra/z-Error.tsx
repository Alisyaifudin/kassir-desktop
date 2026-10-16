import { TableBody, TableCell, TableRow } from "~/components/ui/table";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { ExtraError } from "~/services/extra";

export const ExtraErrorBoundary = createErrorBoundary(ExtraError);

/**
 * Renders inside the extras table, so the fallback is a table body rather than
 * the full-page `ErrorComponent` the legacy page dropped in here.
 */
export function ExtraErrorFallback({ error }: { error: ExtraError }) {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={5} className="text-center text-destructive">
          Biaya lainnya bermasalah: {error.message}
        </TableCell>
      </TableRow>
    </TableBody>
  );
}
