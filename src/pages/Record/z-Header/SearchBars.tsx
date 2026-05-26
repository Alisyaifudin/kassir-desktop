import { DEBOUNCE_DELAY } from "~/lib/constants";
import { SearchIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useQuery } from "../use-query";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { cn } from "~/lib/utils";

export function SearchBars() {
  const [querySearch, setQuerySearch] = useQuery();
  const [query, setQuery] = useState(querySearch);
  const [isFocused, setIsFocused] = useState(false);

  const debounced = useDebouncedCallback((value: string) => {
    setQuerySearch(value);
  }, DEBOUNCE_DELAY);

  return (
    <div className="flex gap-2 flex-1">
      <div className="relative flex items-center flex-1 group">
        <div className={cn(
          "absolute left-2.5 transition-colors duration-200",
          isFocused ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          <SearchIcon size={16} strokeWidth={2.5} />
        </div>
        
        <Input
          id="record-no"
          type="search"
          key="record"
          placeholder="Cari..."
          className={cn(
            "w-full pl-8 pr-3 h-12 rounded-lg border-border bg-muted/40 text-normal font-medium transition-all duration-200",
            "focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-background focus-visible:border-primary/40 shadow-none"
          )}
          value={query}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
