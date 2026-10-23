import { Package, StickyNote } from "lucide-react";
import { getProductKind } from "~/lib/constants";
import type { ProductFull } from "~/services/product";
import { formatPrice, priceRange } from "../../z-ProductBits";

export function UserInfo({ product }: { product: ProductFull }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Package className="icon text-primary" />
        <h2 className="text-small font-semibold">Info Barang</h2>
      </div>

      <Row label="Nama" value={product.name} />
      <Row label="Harga" value={priceRange(product)} />
      <Row label="Modal" value={formatPrice(product.capital)} />
      <Row label="Stok" value={`${product.stock.toLocaleString("id-ID")} pcs`} />

      {product.productNames.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <span className="text-small font-medium text-muted-foreground">Nama Alternatif</span>
          {product.productNames.map((name) => (
            <span key={name.id} className="text-small">
              {name.value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
        <span className="text-small font-medium text-muted-foreground">Listing</span>
        {product.listings.map((listing) => (
          <div key={listing.id} className="flex items-center justify-between gap-2 text-small">
            <span>
              {listing.name}{" "}
              <span className="text-small text-muted-foreground">
                ({listing.kind === "" ? "" : `${getProductKind(listing.kind)} · `}×{listing.unit})
              </span>
            </span>
            <span className="tabular-nums">{formatPrice(listing.price)}</span>
          </div>
        ))}
      </div>

      {product.properties.length > 0 ? (
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

      {product.note !== "" ? (
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50">
      <span className="text-small font-medium text-muted-foreground">{label}</span>
      <span className="break-all text-right text-small">{value === "" ? "-" : value}</span>
    </div>
  );
}
