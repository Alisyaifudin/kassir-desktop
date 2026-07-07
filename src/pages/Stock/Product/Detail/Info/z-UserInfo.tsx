import { Product } from "~/services/product";
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

        {product.codes.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-small ml-2">Kode</span>
            {product.codes.map((code, i) => (
              <DetailRow key={i} label="" value={code} />
            ))}
          </div>
        )}

        {product.capitals.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-small ml-2">Modal & Stok</span>
            {product.capitals.map((c, i) => (
              <div
                key={c.id || i}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border duration-200"
              >
                <span className="text-normal text-foreground">Rp {c.capital.toLocaleString("id")}</span>
                <span className="text-normal text-muted-foreground">{c.stock} pcs</span>
              </div>
            ))}
          </div>
        )}

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
      {label !== "" && (
        <div className="flex items-center gap-3 text-muted-foreground w-1/3">
          <span className="text-normal font-medium">{label}</span>
        </div>
      )}
      <div className="text-right flex justify-end">
        <span className="text-normal text-foreground break-all text-right">
          {value === "" ? "-" : value}
        </span>
      </div>
    </div>
  );
}
