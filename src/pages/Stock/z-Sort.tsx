import { z } from "zod";

export function Sort({
  setSortDir,
  sortDir,
  setSortBy,
  sortBy,
}: {
  sortDir: "asc" | "desc";
  setSortDir: (v: "asc" | "desc") => void;
  sortBy: "barcode" | "name" | "price" | "capital" | "stock";
  setSortBy: (v: "barcode" | "name" | "price" | "capital" | "stock") => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <label htmlFor="sort-products">Urutkan</label>
      <select
        value={sortBy}
        onChange={(e) => {
          const parsed = z
            .enum(["barcode", "name", "price", "capital", "stock"])
            .safeParse(e.currentTarget.value);
          if (!parsed.success) {
            return;
          }
          const v = parsed.data;
          setSortBy(v);
        }}
        className="h-[40px] w-fit outline"
      >
        <option value="name">Nama</option>
        <option value="barcode">Barcode</option>
        <option value="price">Harga</option>
        <option value="capital">Modal</option>
        <option value="stock">Stok</option>
      </select>
      <select
        id="sort-products"
        value={sortDir}
        onChange={(e) => {
          const v = e.currentTarget.value;
          if (v !== "asc" && v !== "desc") {
            return;
          }
          setSortDir(v);
        }}
        className="h-[40px] w-fit outline text-3xl"
      >
        <option value="asc">A-Z</option>
        <option value="desc">Z-A</option>
      </select>
    </div>
  );
}
