import { TextError } from "~/components/TextError";

export function Field({
	error,
	children,
	label,
}: {
	error?: string;
	children: React.ReactNode;
	label: string;
}) {
	return (
		<label className="flex flex-col">
			<div className="grid grid-cols-[120px_1fr] gap-2 items-center">
				<span className="text-normal">{label}</span>
				{children}
			</div>
			{error === "" || error === undefined ? null : (
				<div className="flex gap-2">
					<div className="w-[120px]"></div>
					<TextError>{error}</TextError>
				</div>
			)}
		</label>
	);
}
