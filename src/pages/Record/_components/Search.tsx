import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { getParam, setParam } from "../_utils/params";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function Search() {
	const [search, setSearch] = useSearchParams();
	const query = getParam(search).query;
	const setQuery = setParam(setSearch).query;
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
					setValue(val);
					debounced(val);
				}}
			/>
		</label>
	);
}
