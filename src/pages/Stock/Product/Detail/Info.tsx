import { Product } from "~/database/product/get-by-id";

export function Info({ product }: { product: Product }) {
  return (
    <div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
      <h1 className="font-bold text-big col-span-2">Info barang</h1>
      <p>Nama</p>
      <p>{product.name}</p>
      <p>Harga</p>
      <p>{product.price}</p>
      <p>Modal</p>
      <p>{product.capital}</p>
      <p>Stok</p>
      <p>{product.stock}</p>
      <p>Barcode</p>
      <p>{product.barcode}</p>
      {product.note === "" ? null : (
        <>
          <p>Catatan</p>
          <p>{product.note}</p>
        </>
      )}
    </div>
  );
}
