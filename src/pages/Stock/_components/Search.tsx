import { SearchIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Search({
	query,
	setQuery,
	className,
}: {
	className?: string;
	query: string;
	setQuery: (v: string) => void;
}) {
	const [value, setValue] = useState(query);
	const debounced = useDebouncedCallback((value: string) => {
		setQuery(value);
	}, DEBOUNCE_DELAY);
	const size = useSize();
	return (
		<label className={cn("relative flex gap-2 items-center flex-1", className)}>
			<SearchIcon className="absolute left-2" size={style[size].icon} />
			<Input
				style={style[size].text}
				type="search"
				placeholder="Cari..."
				className="w-full pl-8"
				value={value}
				aria-autocomplete="list"
				onChange={(e) => {
					const val = e.currentTarget.value;
					setValue(val.trimStart());
					debounced(val);
				}}
			/>
		</label>
	);
}
