export function Info({ product }: { product: DB.AdditionalItem }) {
	return (
		<div className="grid grid-cols-[150px_1fr] h-fit gap-3 text-3xl w-full">
			<h1 className="font-bold text-3xl col-span-2">Info biaya lainnya</h1>
			<p>Nama</p>
			<p>{product.name}</p>
			<p>Jenis</p>
			<p>{product.kind}</p>
			<p>Nilai</p>
			<p>{product.value}</p>
		</div>
	);
}
