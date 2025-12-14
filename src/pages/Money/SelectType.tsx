import { memo } from "react";
import { z } from "zod";

export const SelectType = memo(function({
	type,
	onChange,
}: {
	type: "absolute" | "change";
	onChange: (type: "absolute" | "change") => void;
}) {
	return (
		<select
			value={type}
			onChange={(e) => {
				const v = z.enum(["absolute", "change"]).catch("absolute").parse(e.currentTarget.value);
				onChange(v);
			}}
			className="h-[55px] w-fit outline text-3xl outline-border shadow-md rounded-sm"
		>
			<option value="change">Perubahan</option>
			<option value="absolute">Mutlak</option>
		</select>
	);
})
