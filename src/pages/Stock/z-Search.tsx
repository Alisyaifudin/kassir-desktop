import { SearchIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { useEffect, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { useQuery } from "./use-query";

export function Search({ className }: { className?: string }) {
  const [query, setQuery] = useQuery();
  const [value, setValue] = useState(query);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.focus();
  }, []);
  const debounced = useDebouncedCallback((value: string) => {
    setQuery(value);
  }, DEBOUNCE_DELAY);
  return (
    <label className={cn("relative flex gap-2 items-center flex-1", className)}>
      <SearchIcon className="absolute left-2" />
      <Input
        ref={ref}
        type="search"
        key="stock"
        id="stock-product-search"
        placeholder="Cari..."
        className={cn("w-full pl-8", "pl-10 small:pl-8")}
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
