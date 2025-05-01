import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { SetURLSearchParams } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "../../components/ui/input";

export function Search({
	query,
	setSearch,
}: {
	query: string;
	setSearch: SetURLSearchParams;
}) {
	const [value, setValue] = useState(query);
	const debounced = useDebouncedCallback((value: string) => {
		setQuery(setSearch, value);
	}, 200);
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

function setQuery(setSearch: SetURLSearchParams, query: string) {
	setSearch((prev) => {
		const params = new URLSearchParams(prev);
		params.set("query", query);
		return params;
	});
}

