import { Package, StickyNote } from "lucide-react";
import { SkeletonText } from "~/components/ui/skeleton";
import { getProductKind } from "~/lib/constants";
import type { ProductFull } from "~/services/product";
import { formatPrice, priceRange } from "../../z-ProductBits";

/**
 * The read-only view of a product, for a non-admin.
 *
 * Everything that is a word is drawn from the first frame: the heading, the four
 * row labels, the `Listing` card and its title. Only the values pulse, each one in
 * the line box its text will occupy, so the column is the same height at every
 * step of the read.
 *
 * The three optional cards at the bottom — alternative names, properties, the note
 * — are the one thing that cannot be drawn early: whether they exist *is* the
 * data, and a card that appears and is then taken away is worse than a card that
 * arrives. They come in below the facts, so nothing already on screen moves.
 */
export function UserInfo({ product }: { product: ProductFull | undefined }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Package className="icon text-primary" />
        <h2 className="text-small font-semibold">Info Barang</h2>
      </div>

      <Row label="Nama" value={product?.name} />
      <Row label="Harga" value={product === undefined ? undefined : priceRange(product)} />
      <Row label="Modal" value={product === undefined ? undefined : formatPrice(product.capital)} />
      <Row
        label="Stok"
        value={product === undefined ? undefined : `${product.stock.toLocaleString("id-ID")} pcs`}
      />

      {/* The card and its title are static — a product always has at least one
          listing — so only the rows are pending. */}
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
        <span className="text-small font-medium text-muted-foreground">Listing</span>
        {product === undefined ? (
          <ListingRowSkeleton />
        ) : (
          product.listings.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between gap-2 text-small">
              <span>
                {listing.name}{" "}
                <span className="text-small text-muted-foreground">
                  ({listing.kind === "" ? "" : `${getProductKind(listing.kind)} · `}×{listing.unit})
                </span>
              </span>
              <span className="tabular-nums">{formatPrice(listing.price)}</span>
            </div>
          ))
        )}
      </div>

      {product !== undefined && product.productNames.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <span className="text-small font-medium text-muted-foreground">Nama Alternatif</span>
          {product.productNames.map((name) => (
            <span key={name.id} className="text-small">
              {name.value}
            </span>
          ))}
        </div>
      ) : null}

      {product !== undefined && product.properties.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <span className="text-small font-medium text-muted-foreground">Properti</span>
          {product.properties.map((property) => (
            <div key={property.id} className="flex items-center justify-between gap-2 text-small">
              <span className="text-muted-foreground">{property.key}</span>
              <span className="break-all text-right">{property.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {product !== undefined && product.note !== "" ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <span className="flex items-center gap-2 text-small font-medium text-muted-foreground">
            <StickyNote className="size-4 small:size-3" /> Catatan
          </span>
          <p className="text-small leading-relaxed">{product.note}</p>
        </div>
      ) : null}
    </div>
  );
}

/** `undefined` is "not read yet" — the label stays, the value pulses in place. */
function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50">
      <span className="text-small font-medium text-muted-foreground">{label}</span>
      <span className="break-all text-right text-small">
        {value === undefined ? (
          <SkeletonText className="w-24" />
        ) : value === "" ? (
          "-"
        ) : (
          value
        )}
      </span>
    </div>
  );
}

/**
 * One listing line before the listing arrives: the row's own box — a name on the
 * left, an amount on the right — with both texts pulsing inside their line boxes.
 */
function ListingRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 text-small">
      <span>
        <SkeletonText className="w-28" />
      </span>
      <span className="tabular-nums">
        <SkeletonText className="w-16" />
      </span>
    </div>
  );
}
