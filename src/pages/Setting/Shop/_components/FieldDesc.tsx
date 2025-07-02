export function FieldDesc({ children, label }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1 text-3xl">
			<div>
				<span>{label}</span>
			</div>
			{children}
		</label>
	);
}
