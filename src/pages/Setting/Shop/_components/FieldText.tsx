import React from "react";
import { style } from "~/lib/style";

export function FieldText({
	children,
	label,
	size,
}: {
	children: React.ReactNode;
	label: string;
	size: "small" | "big";
}) {
	return (
		<label style={style[size].text} className="grid grid-cols-[160px_10px_1fr] items-center gap-1">
			<span>{label}</span>:{children}
		</label>
	);
}
