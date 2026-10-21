import { Effect } from "effect";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { service } from "~/services";

/**
 * Escape hatch for a wedged window. The cart is persisted on a debounce, so the
 * pending edits are written first: reloading with an unsaved cart would lose the
 * sale being rung up. A failed flush cancels the reload instead of hiding the loss.
 */
export function Refresh() {
  async function reload() {
    try {
      await Effect.runPromise(service.transaction.flush());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Keranjang belum tersimpan");
      return;
    }
    window.location.reload();
  }

  return (
    <Button
      size="icon"
      aria-label="Muat ulang aplikasi"
      title="Muat ulang aplikasi"
      className="rounded-full h-10 w-10 small:h-8 small:w-8 hover:bg-sky-400/50"
      onClick={() => void reload()}
      variant="ghost"
    >
      <RefreshCcw className="size-6 small:size-5" />
    </Button>
  );
}
