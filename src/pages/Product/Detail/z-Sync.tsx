import { Either } from "effect";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { Button } from "~/components/ui/button";
import { useSyncRun } from "~/components/sync/use-sync";
import { cn } from "~/lib/utils";
import { service } from "~/services";

/**
 * The one-product manual sync, on the product detail header
 * (`docs/SYNC-V2-ONE-PRODUCT.md` §5.3).
 *
 * It is a foreground action, not the background Sinkronisasi run: this button
 * owns its spinner and its toast, and it stops when the screen goes away. The
 * service still serialises it against the full sync, so the button is disabled
 * while a full run is in flight and a click during one is refused with a plain
 * sentence rather than silently queued.
 */
export function ProductSyncButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const { running } = useSyncRun();
  const { pending, mutate } = useMutation((id: string) => service.sync.syncProduct(id));

  async function handleClick() {
    const result = await mutate(productId);
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
      return;
    }
    const report = result.right;
    const parts = [`${report.pushed} diunggah`, `${report.pulled} diunduh`];
    if (report.imagesUp > 0) parts.push(`${report.imagesUp} gambar naik`);
    if (report.imagesDown > 0) parts.push(`${report.imagesDown} gambar turun`);
    toast(`"${productName}" tersinkron — ${parts.join(", ")}`);
  }

  const disabled = pending || running;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => void handleClick()}
      title={
        running
          ? "Sinkronisasi lain sedang berjalan"
          : "Kirim perubahan produk ini, lalu ambil versi server"
      }
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} />
      <span className="hidden sm:inline">{pending ? "Menyinkronkan…" : "Sinkronkan produk"}</span>
    </Button>
  );
}
