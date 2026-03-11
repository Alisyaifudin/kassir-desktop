import { Input } from "~/components/ui/input";
import { useQuery } from "./use-query";
import { useState } from "react";

export function SearchInput() {
  const [querySearch, setQuerySearch] = useQuery();
  const [query, setQuery] = useState(querySearch);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value);
    setQuerySearch(e.currentTarget.value);
  };
  return (
    <Input
      className="mx-1"
      type="search"
      placeholder="Cari..."
      value={query}
      onChange={handleChange}
      aria-autocomplete="list"
    />
  );
}
