import { Effect, Stream } from "effect";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useQuery } from "~/components/Loader";
import { useInertApp } from "~/components/cart/use-inert-app";
import { ImageViewer, type ViewerImage } from "~/components/ImageViewer";
import { service } from "~/services";

/**
 * The card's photo, opened: every photo of the product behind the line, big
 * enough to recognise the goods by.
 *
 * A peek, like the detail sheet — it reads one product once and writes nothing.
 * The cart line itself only carries the one cover the search grid showed, so the
 * gallery has to be asked for; until the answer lands the cover is already on
 * screen, and that is a photo of this product too.
 */
export function ProductImagesDialog({
  open,
  onOpenChange,
  productId,
  cover,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  /** The photo the card is already showing, drawn while the gallery loads. */
  cover?: ViewerImage | null;
}) {
  // The sheet owns the keyboard while it is up: the arrows belong to the gallery,
  // not to the cart grid behind it.
  useInertApp(open);
  const res = useQuery(
    () =>
      Stream.fromEffect(
        productId === null ? Effect.sync(() => null) : service.product.get.byId(productId),
      ),
    [productId],
  );
  const product = res.type === "success" ? res.data : null;
  const failed = res.type === "error";

  // Radix keeps the panel on screen for the exit animation, but the parent drops
  // `productId` the moment the sheet closes — so the gallery it just read is held
  // until the panel is gone, or the closing sheet would blink empty. Cleared on
  // open: a sheet opened on another product must not show the previous one, not
  // even for the frame before its own read starts.
  const held = useRef<{ name: string; images: ViewerImage[] } | null>(null);
  const wasOpen = useRef(open);
  if (wasOpen.current !== open) {
    wasOpen.current = open;
    if (open) held.current = null;
  }
  const shown = product === null ? held.current : { name: product.name, images: product.images };
  if (shown !== null) held.current = shown;

  // A product whose photos have not arrived yet — or one that lost them — still
  // has the cover the card was drawn from.
  const images =
    shown !== null && shown.images.length > 0 ? shown.images : cover != null ? [cover] : [];
  const count = images.length;
  const label = shown?.name ?? "Gambar produk";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="truncate">{label}</DialogTitle>
          <DialogDescription>
            {failed
              ? "Daftar gambar produk tidak bisa dimuat."
              : count === 0
                ? "Produk ini belum punya gambar."
                : count === 1
                  ? "1 gambar"
                  : `${count} gambar · panah kiri dan kanan untuk berpindah`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <ImageViewer images={images} label={label} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
