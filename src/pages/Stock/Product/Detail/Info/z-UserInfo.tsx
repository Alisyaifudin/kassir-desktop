import { Product } from "~/database/product/get-by-id";
import { Package, StickyNote } from "lucide-react";

export function UserInfo({ product }: { product: Product }) {
  return (
    <div className="h-full overflow-y-auto w-full pr-2 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
          <Package className="w-5 h-5" />
        </div>
        <h1 className="font-bold text-2xl tracking-tight text-foreground">Info Barang</h1>
      </div>

      <div className="flex flex-col gap-3">
        <DetailRow label="Nama" value={product.name} />
        <DetailRow label="Harga" value={product.price} />
        <DetailRow label="Modal" value={product.capital} />
        <DetailRow label="Stok" value={product.stock} />
        <DetailRow label="Barcode" value={product.barcode ?? ""} />

        {product.note !== "" ? (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <StickyNote className="w-4 h-4" />
              <span className="text-sm font-medium">Catatan</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">{product.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border duration-200">
      <div className="flex items-center gap-3 text-muted-foreground w-1/3">
        <span className="text-normal font-medium">{label}</span>
      </div>
      <div className="text-right w-2/3 flex justify-end">
        <span className="text-normal text-foreground break-all text-right">
          {value === "" ? "-" : value}
        </span>
      </div>
    </div>
  );
}
