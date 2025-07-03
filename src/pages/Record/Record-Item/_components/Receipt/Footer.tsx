export function Footer({
	footers,
	socials,
	totalProductTypes,
	totalQty,
}: {
	footers: string[];
	socials: DB.Social[];
	totalProductTypes: number;
	totalQty: number;
}) {
	return (
		<>
			<div>
				<p>
					{totalProductTypes} Jenis/{totalQty} pcs
				</p>
			</div>
			<div className="flex items-center flex-col">
				{footers.map((h, i) => (
					<p className="text-center" key={i}>
						{h}
					</p>
				))}
				{socials.map((s) => (
					<p key={s.id}>
						{s.name}: {s.value}
					</p>
				))}
			</div>
		</>
	);
}
