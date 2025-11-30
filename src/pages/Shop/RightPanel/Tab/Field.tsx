import React from "react";
import { TextError } from "~/components/TextError";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";
import { cn } from "~/lib/utils";

export function Field({
	label,
	children,
	error,
	className,
}: {
	label: string;
	children: React.ReactNode;
	error?: string;
	className?: string;
}) {
	const size = useSize();
	return (
		<label className={cn("flex flex-col gap-1 w-full", className)}>
			<span style={style[size].text}>{label}:</span>
			{children}
			<TextError>{error}</TextError>
		</label>
	);
}
