import { Input } from "~/components/ui/input";
import { useQuery } from "./use-query";

export function SearchInput() {
  const [query, setQuery] = useQuery();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value);
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
