import { style } from "~/lib/style";

export function FieldDesc({
	children,
	label,
	size,
}: {
	label: string;
	children: React.ReactNode;
	size: "big" | "small";
}) {
	return (
		<label className="flex flex-col gap-1" style={style[size].text}>
			<div>
				<span>{label}</span>
			</div>
			{children}
		</label>
	);
}
