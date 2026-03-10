import { Skeleton } from "~/components/ui/skeleton";
import { Product } from "~/database/product/get-by-id";

export function UserInfo({ product }: { product: Product }) {
  return (
    <div className="h-full overflow-hidden">
      <div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
        <h1 className="font-bold text-big col-span-2">Info barang</h1>
        <span>Nama</span>
        <Field>{product?.name}</Field>
        <span>Harga</span>
        <Field>{product?.price}</Field>
        <span>Modal</span>
        <Field>{product?.capital}</Field>
        <span>Stok</span>
        <Field>{product?.stock}</Field>
        <span>Barcode</span>
        <Field>{product?.barcode}</Field>
        {product.note !== "" ? (
          <>
            <span>Catatan</span>
            <span>{product.note}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({ children }: { children?: number | string }) {
  if (children === undefined) return <Skeleton className="w-full h-10" />;
  return <span className="w-full h-10">{children}</span>;
}
