import { z } from "zod";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Sort({
	setSortDir,
	sortDir,
	setSortBy,
	sortBy,
}: {
	sortDir: "asc" | "desc";
	setSortDir: (v: "asc" | "desc") => void;
	sortBy: "barcode" | "name" | "price" | "capital" | "stock" | "same";
	setSortBy: (v: "barcode" | "name" | "price" | "capital" | "stock" | "same") => void;
}) {
	const size = useSize();
	return (
		<div className="flex gap-2 items-center">
			<label style={style[size].text} htmlFor="sort-products">
				Urutkan
			</label>
			<select
				value={sortBy}
				onChange={(e) => {
					const parsed = z
						.enum(["barcode", "name", "price", "capital", "stock", "same"])
						.safeParse(e.currentTarget.value);
					if (!parsed.success) {
						return;
					}
					const v = parsed.data;
					setSortBy(v);
				}}
				style={style[size].text}
				className="h-[40px] w-fit outline"
			>
				<option value="name">Nama</option>
				<option value="barcode">Barcode</option>
				<option value="price">Harga</option>
				<option value="capital">Modal</option>
				<option value="stock">Stok</option>
				<option value="same">Sama</option>
			</select>
			<select
				style={style[size].text}
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
