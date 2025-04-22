export function Field({
	error,
	children,
	label,
}: {
	error: string;
	children: React.ReactNode;
	label: string;
}) {
	return (
		<label className="flex flex-col">
			<div className="grid grid-cols-[80px_1fr] gap-2">
				<span>{label}</span>
				{children}
			</div>
			{error === "" ? null : (
				<div className="grid grid-cols-[80px_1fr] gap-2">
					<div></div>
					<p className="text-red-500">{error}</p>
				</div>
			)}
		</label>
	);
}
