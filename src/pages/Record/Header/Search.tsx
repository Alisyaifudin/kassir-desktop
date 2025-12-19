import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useParams, useSetParams } from "../use-params";

export function Search() {
  const query = useParams().query;
  const setQuery = useSetParams().query;
  const [value, setValue] = useState(query);
  const debounced = useDebouncedCallback((value: string) => {
    setQuery(value);
  }, DEBOUNCE_DELAY);
  return (
    <div className="flex gap-2 items-center flex-1">
      <label htmlFor="record-no">
        <SearchIcon />
      </label>
      <Input
        id="record-no"
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
    </div>
  );
}
