import { Either } from "effect";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { useMutation } from "~/components/Loader";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { isPublished, type Product } from "~/services/product";

/**
 * Publishes or withdraws a product from the till, from the product detail
 * header.
 *
 * It writes immediately (like Hapus and the stock-adjust dialog), so it is not
 * part of the form draft or the undo history: the switch shows what the
 * database holds the moment the write lands, and `Simpan` never carries it.
 *
 * Withdrawing hides the product and all of its listings from Pos and Restock —
 * search, grid and barcode — through `ListingService`; its stock, history and
 * row in `/products` are untouched.
 */
export function PublishToggle({ product }: { product: Product }) {
  const published = isPublished(product);
  const { pending, mutate } = useMutation((next: boolean) =>
    service.product.set.publish(product.id, next),
  );

  async function handleChange(next: boolean) {
    const result = await mutate(next);
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
      return;
    }
    toast(
      next ? `"${product.name}" terbit di kasir` : `"${product.name}" disembunyikan dari kasir`,
    );
  }

  return (
    <label
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-small transition-colors",
        // The same grey the /products list uses for a withdrawn row: the state
        // reads from the chip before the label is read.
        published ? "text-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <Switch
        checked={published}
        disabled={pending}
        onCheckedChange={(next) => void handleChange(next)}
        aria-label={published ? "Sembunyikan dari kasir" : "Terbitkan ke kasir"}
        title={published ? "Sembunyikan dari kasir" : "Terbitkan ke kasir"}
      />
      <span className="whitespace-nowrap">{published ? "Terbit di kasir" : "Tidak terbit"}</span>
      <Spinner when={pending} />
    </label>
  );
}
