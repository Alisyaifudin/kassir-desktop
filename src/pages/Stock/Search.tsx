import { SearchIcon } from "lucide-react";
import { Input } from "../../components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { useState } from "react";

export function Search({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
	const [value, setValue] = useState(query);
	const debounced = useDebouncedCallback(
		(value: string) => {
			setQuery(value);
		},
		200
	);
	return (
		<label className="flex gap-2 items-center flex-1">
			<SearchIcon size={35} />
			<Input
				type="search"
				placeholder="Cari..."
				className="w-full"
				value={value}
				onChange={(e) => {
					const val = e.currentTarget.value;
					setValue(val);
					debounced(val);
				}}
			/>
		</label>
	);
}
