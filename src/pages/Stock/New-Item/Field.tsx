import { TextError } from "../../../components/TextError";

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
			<div className="flex gap-2 items-center">
				<span className="w-[120px] text-3xl">{label}</span>
				{children}
			</div>
			{error === "" ? null : (
				<div className="flex gap-2">
					<div className="w-[120px]"></div>
					<TextError>{error}</TextError>
				</div>
			)}
		</label>
	);
}
