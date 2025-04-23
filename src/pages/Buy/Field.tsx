import React from "react";

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
			<span>{label}:</span>
			{children}
			{error === undefined || error === "" ? null : <p className="text-red-500">{error}</p>}
		</label>
	);
}
