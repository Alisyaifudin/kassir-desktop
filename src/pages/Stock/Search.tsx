import { SearchIcon } from "lucide-react";
import { Input } from "../../components/ui/input";

export function Search({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
	return (
		<label className="flex gap-2 items-center flex-1">
			<SearchIcon size={35} />
			<Input
				type="text"
        placeholder="Cari..."
				className="w-full"
				value={query}
				onChange={(e) => setQuery(e.currentTarget.value)}
			/>
		</label>
	);
}
