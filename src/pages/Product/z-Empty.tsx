import { PackageOpen } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Empty list state. `total` is the *unfiltered* product count, so the message
 * can distinguish "your filters matched nothing" from "the catalog is empty" —
 * otherwise a zero-result filter combo reads as missing data.
 */
export function Empty({ total, onReset }: { total: number; onReset: () => void }) {
  const isFiltered = total > 0;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <PackageOpen className="size-12" />
      <p className="text-sm">
        {isFiltered ? `Tidak ada dari ${total} produk yang cocok.` : "Belum ada produk."}
      </p>
      {isFiltered ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 text-sm"
          onClick={onReset}
        >
          Reset filter
        </Button>
      ) : null}
    </div>
  );
}
