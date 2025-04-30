import React from "react";
import { TextError } from "../../../components/TextError";

export function Field({
	label,
	children,
	error,
}: {
	label: string;
	children: React.ReactNode;
	error?: string;
}) {
	return (
		<label className="flex flex-col gap-1 w-full">
			<span className="text-3xl">{label}:</span>
			{children}
			{error === undefined || error === "" ? null : <TextError>{error}</TextError>}
		</label>
	);
}
