import { Button } from "~/components/ui/button";

/**
 * Held rather than removed: pushing a past record back into the shop cart needs
 * the cart (`tx.db`) rebuilt on the services layer, and `/shop` is not routed
 * in the meantime.
 */
export function ToTransaction() {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled variant="secondary">
        Jadikan Transaksi
      </Button>
    </div>
  );
}
