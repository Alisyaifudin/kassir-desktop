export function Sort({
	setSort,
	sort,
}: {
	sort: "asc" | "desc";
	setSort: (v: "asc" | "desc") => void;
}) {
	return (
		<div className="flex gap-2 items-center">
			<label htmlFor="sort-products" className="text-3xl">
				Urutkan
			</label>
			<select
				id="sort-products"
				value={sort}
				onChange={(e) => {
					const v = e.currentTarget.value;
					if (v !== "asc" && v !== "desc") {
						return;
					}
					setSort(v);
				}}
				className="h-[40px] w-fit outline text-3xl"
			>
				<option value="asc">A-Z</option>
				<option value="desc">Z-A</option>
			</select>
		</div>
	);
}
