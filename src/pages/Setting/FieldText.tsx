import React from "react";

export function FieldText({ children, label }: { children: React.ReactNode; label: string }) {
	return (
		<label className="grid grid-cols-[160px_10px_1fr] items-center gap-1 text-3xl">
			<span>{label}</span>:{children}
		</label>
	);
}
