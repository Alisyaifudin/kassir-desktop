import { Effect, Stream } from "effect";
import { useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ExternalLink, Package } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { SkeletonText } from "~/components/ui/skeleton";
import { useQuery } from "~/components/Loader";
import { useInertApp } from "~/components/cart/use-inert-app";
import { useImageUrl } from "~/hooks/use-image";
import { getProductKind } from "~/lib/constants";
import { formatDate } from "~/lib/date";
import { cn } from "~/lib/utils";
import { rupiah } from "~/components/cart/util-rupiah";
import { isPublished, type ProductFull, type ProductImage } from "~/services/product";
import { service } from "~/services";

/**
 * The card's number cell, read-only: everything behind the line that the cart
 * itself does not carry — the product's other listings, its free metadata
 * properties, its stock lots and its note.
 *
 * Read-only on purpose. The cart is a till, and a form dropped over it would be
 * a second place to edit a catalogue row; the one way out to editing is the
 * link in the footer, which leaves for the product's own screen. So this asks
 * for one product, once, and shows what came back.
 *
 * `listingId` is the listing the cart line holds, marked in the list — "this is
 * the one I am selling" is the first thing the sheet is asked.
 */
export function ProductDetailDialog({
  open,
  onOpenChange,
  productId,
  listingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  listingId: string | null;
}) {
  // The sheet owns the keyboard while it is up: the grid's arrows must not walk
  // the cart behind it, and Esc belongs to the dialog.
  useInertApp(open);
  // One read of one product. `byId` rather than the catalogue stream: the sheet
  // is a peek, and the link is where the live screen lives.
  const res = useQuery(
    () =>
      Stream.fromEffect(
        productId === null ? Effect.sync(() => null) : service.product.get.byId(productId),
      ),
    [productId],
  );
  const product = res.type === "success" ? res.data : null;
  // `useQuery` re-runs the moment `productId` changes, but one render still sees
  // the previous answer — and that answer is a `null` product, because the sheet
  // was closed. So a success without a product is "not read yet", never "gone":
  // a deleted row fails the read instead. Rendering it as "tidak ditemukan"
  // flashed that sentence for a frame every time the sheet opened.
  const failed = res.type === "error";

  // Radix keeps the panel on screen for the exit animation, but the parent drops
  // `productId` the moment the sheet closes — so the row it just read is held
  // until the panel is gone, or the closing sheet would pulse a skeleton. Cleared
  // on open: a sheet opened on another product must not show the previous one,
  // not even for the frame before its own read starts.
  const held = useRef<ProductFull | null>(null);
  const wasOpen = useRef(open);
  if (wasOpen.current !== open) {
    wasOpen.current = open;
    if (open) held.current = null;
  }
  if (product !== null) held.current = product;
  const shown = product ?? held.current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex min-w-0 items-center gap-2">
            <span className="truncate">{shown?.name ?? "Detail produk"}</span>
            {shown !== null && !isPublished(shown) ? (
              <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-sm font-medium text-muted-foreground ring-1 ring-inset ring-foreground/10">
                Tidak terbit
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="tabular-nums">
            {shown !== null ? (
              <SheetSummary product={shown} />
            ) : failed ? (
              "Produk tidak bisa dimuat."
            ) : (
              <SkeletonText className="w-64" />
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          {failed ? (
            <p className="text-sm text-muted-foreground">
              Detail produk tidak bisa dimuat. Produk mungkin sudah dihapus.
            </p>
          ) : shown === null ? (
            <div className="flex flex-col gap-2">
              <SkeletonText className="w-40" />
              <SkeletonText className="w-full" />
              <SkeletonText className="w-2/3" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="flex min-w-0 flex-col gap-6">
                <SheetSection
                  title="Listing"
                  hint={
                    shown.listings.length > 1
                      ? "Produk ini dijual dalam beberapa satuan."
                      : undefined
                  }
                >
                  <div className="flex flex-col divide-y rounded-md border">
                    {shown.listings.map((listing) => (
                      <div
                        key={listing.id}
                        className={cn(
                          "flex flex-col gap-0.5 px-3 py-2",
                          listing.id === listingId && "bg-primary/5",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-base font-medium">{listing.name}</span>
                          {listing.id === listingId ? (
                            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                              Di keranjang
                            </span>
                          ) : null}
                          {listing.kind === "" ? null : (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {getProductKind(listing.kind)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm tabular-nums">
                          <span className="truncate font-mono text-muted-foreground">
                            {listing.code ?? "tanpa kode"}
                          </span>
                          <span className="shrink-0">
                            {rupiah(listing.price)}{" "}
                            <span className="text-muted-foreground">×{listing.unit}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                    {shown.listings.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Belum ada listing.</p>
                    ) : null}
                  </div>
                </SheetSection>

                <SheetSection title="Catatan">
                  {shown.note.trim() === "" ? (
                    <p className="text-sm text-muted-foreground">Tidak ada catatan.</p>
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{shown.note}</p>
                  )}
                </SheetSection>
              </div>

              <div className="flex min-w-0 flex-col gap-6">
                <SheetSection title="Properti">
                  {shown.properties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada properti.</p>
                  ) : (
                    <dl className="flex flex-col divide-y rounded-md border text-sm">
                      {shown.properties.map((property) => (
                        <div
                          key={property.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-3 py-2"
                        >
                          <dt className="truncate text-muted-foreground">{property.key}</dt>
                          <dd className="truncate">{property.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </SheetSection>

                <SheetSection title="Stok" hint={`${shown.stock} pcs tersedia`}>
                  {shown.stocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada lot stok.</p>
                  ) : (
                    <div className="flex flex-col divide-y rounded-md border text-sm tabular-nums">
                      {shown.stocks.map((stock, index) => (
                        <div key={stock.id} className="flex flex-col gap-0.5 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Lot {index + 1}</span>
                            <span className="font-medium">{stock.value} pcs</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Modal / pcs</span>
                            <span>{rupiah(stock.capital)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(stock.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SheetSection>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-3">
          {product === null ? null : <SheetFooter productId={product.id} />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The way out of the cart: the product's own screen, with `url_back` naming this
 * cart so Esc there comes back to the same draft.
 *
 * The location is read here rather than in the sheet for the same reason the
 * link lives here: a route is only known inside a router, and this is the one
 * part of the dialog that needs one.
 */
function SheetFooter({ productId }: { productId: string }) {
  const back = useLocation();
  return (
    <Button variant="outline" asChild>
      <Link
        to={{
          pathname: `/products/${productId}`,
          search: `url_back=${encodeURIComponent(`${back.pathname}${back.search}`)}`,
        }}
      >
        <ExternalLink className="size-4" />
        Buka detail produk
      </Link>
    </Button>
  );
}

/** The one-line reading of a product: what it is worth, and how much is here. */
function SheetSummary({ product }: { product: ProductFull }) {
  return (
    <span className="flex items-center gap-2">
      <Cover image={product.cover} />
      {`${product.listings.length} listing · ${product.stock} pcs · modal ${rupiah(product.capital)}`}
    </span>
  );
}

/** The product's cover, or the same empty frame the search grid draws. */
function Cover({ image }: { image: ProductImage | null }) {
  const src = useImageUrl(image?.name ?? null, image?.mime ?? null);
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted/40">
      {src !== null ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Package className="size-4 text-muted-foreground/40" />
      )}
    </span>
  );
}

function SheetSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint === undefined ? null : (
          <span className="truncate text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}
