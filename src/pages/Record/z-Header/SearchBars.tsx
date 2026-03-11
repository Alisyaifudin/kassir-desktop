import { DEBOUNCE_DELAY } from "~/lib/constants";
import { SearchIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useQuery } from "../use-query";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function SearchBars() {
  const [querySearch, setQuerySearch] = useQuery();
  const [query, setQuery] = useState(querySearch);
  const debounced = useDebouncedCallback((value: string) => {
    setQuerySearch(value);
  }, DEBOUNCE_DELAY);
  return (
    <div className="flex gap-2 flex-1 pl-4">
      <div className="flex gap-2 items-center flex-1">
        <label htmlFor="record-no">
          <SearchIcon />
        </label>
        <Input
          id="record-no"
          type="search"
          key="record"
          placeholder="Cari..."
          className="w-full"
          value={query}
          aria-autocomplete="list"
          onChange={(e) => {
            const val = e.currentTarget.value;
            setQuery(val);
            debounced(val);
          }}
        />
      </div>
    </div>
  );
}
