import { SearchIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function Search({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
	const [value, setValue] = useState(query);
	const debounced = useDebouncedCallback((value: string) => {
		setQuery(value);
	}, DEBOUNCE_DELAY);
	return (
		<label className="flex gap-2 items-center flex-1">
			<SearchIcon size={35} />
			<Input
				type="search"
				placeholder="Cari..."
				className="w-full"
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
