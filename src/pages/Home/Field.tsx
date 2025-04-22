import React from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1 w-full">
			<span>{label}:</span>
			{children}
		</label>
	);
}
