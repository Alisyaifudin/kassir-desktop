import { Either } from "effect";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { useMutation } from "~/components/Loader";
import { SkeletonText } from "~/components/ui/skeleton";
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
 *
 * The chip is chrome and is drawn before the row arrives: the frame, the switch
 * and the spinner are all here from the first frame, disabled. The *word* is the
 * value — `Terbit di kasir` and `Tidak terbit` are two readings of one slot — so
 * it pulses, in a box the width of the longer word, and the word it will show
 * never has to nudge the chip when it lands.
 */
export function PublishToggle({ product }: { product: Product | undefined }) {
  const published = product !== undefined && isPublished(product);
  const disabled = product === undefined;
  const { pending, mutate } = useMutation((next: boolean) =>
    service.product.set.publish(product?.id ?? "", next),
  );

  async function handleChange(next: boolean) {
    if (product === undefined) return;
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
        "flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-sm transition-colors",
        // The same grey the /products list uses for a withdrawn row: the state
        // reads from the chip before the label is read. While the row is still
        // being read the chip wears the quiet grey — it is neither claim.
        published && !disabled ? "text-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <Switch
        checked={published}
        disabled={disabled || pending}
        onCheckedChange={(next) => void handleChange(next)}
        aria-label={
          disabled
            ? "Status terbit di kasir"
            : published
              ? "Sembunyikan dari kasir"
              : "Terbitkan ke kasir"
        }
        title={disabled ? undefined : published ? "Sembunyikan dari kasir" : "Terbitkan ke kasir"}
      />
      {disabled ? (
        // The longer of the two words holds the slot's width, invisibly, so the
        // chip does not resize when the real one arrives.
        <span className="relative whitespace-nowrap text-transparent select-none" aria-hidden>
          Terbit di kasir
          <SkeletonText className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2" />
        </span>
      ) : (
        <span className="whitespace-nowrap">{published ? "Terbit di kasir" : "Tidak terbit"}</span>
      )}
      <Spinner when={pending} />
    </label>
  );
}
