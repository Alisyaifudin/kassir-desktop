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
			<div className="flex gap-2">
				<span className="w-[80px]">{label}</span>
				{children}
			</div>
			{error === "" ? null : (
				<div className="flex gap-2">
					<div className="w-[80px]"></div>
					<p className="text-red-500">{error}</p>
				</div>
			)}
		</label>
	);
}
