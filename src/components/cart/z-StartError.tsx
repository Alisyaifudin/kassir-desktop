import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Shown when the screen could not open its first cart. Without it, a rejected
 * `transaction.add.new` (a locked or unreadable `tx.db`) left the page on an
 * endless spinner: nothing was written, so the "always have a cart" effect never
 * re-ran, and the operator had no message, no retry and no way to sell.
 */
export function CartStartError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-2xl font-bold text-foreground">Tidak bisa memulai transaksi</p>
      <p className="text-base text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RotateCcw />
        Coba lagi
      </Button>
    </div>
  );
}
