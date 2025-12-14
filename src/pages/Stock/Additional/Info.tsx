export function Info({ additional }: { additional: DB.AdditionalItem }) {
	return (
		<div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
			<h1 className="font-bold text-big col-span-2">Info biaya lainnya</h1>
			<p>Nama</p>
			<p>{additional.name}</p>
			<p>Jenis</p>
			<p>{additional.kind}</p>
			<p>Nilai</p>
			<p>{additional.value}</p>
		</div>
	);
}
