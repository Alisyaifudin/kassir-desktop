import { SearchIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";

export function Search({
  query,
  setQuery,
  className,
}: {
  className?: string;
  query: string;
  setQuery: (v: string) => void;
}) {
  const [value, setValue] = useState(query);
  const debounced = useDebouncedCallback((value: string) => {
    setQuery(value);
  }, DEBOUNCE_DELAY);
  const size = useSize();
  return (
    <label className={cn("relative flex gap-2 items-center flex-1", className)}>
      <SearchIcon className="absolute left-2" />
      <Input
        type="search"
        placeholder="Cari..."
        className={cn("w-full pl-8", css.search[size])}
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
