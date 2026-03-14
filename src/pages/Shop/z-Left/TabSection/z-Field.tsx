import React from "react";
import { TextError } from "~/components/TextError";
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
	return (
		<label className={cn("flex flex-col gap-1 w-full", className)}>
			<span>{label}:</span>
			{children}
			<TextError>{error}</TextError>
		</label>
	);
}
