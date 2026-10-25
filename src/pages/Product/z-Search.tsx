import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { SearchIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { SEARCH_DELAY } from "~/lib/constants";

export function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [local, setLocal] = useState(value);
  const debounced = useDebouncedCallback(onChange, SEARCH_DELAY);
  // Arriving on this page is almost always "find a product", so the bar takes the
  // cursor on the way in; the alternative is a click before the first keystroke.
  // Same as the Extra page's search.
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative flex min-w-[180px] flex-1 items-center">
      <SearchIcon className="absolute left-3 size-6 text-muted-foreground small:size-5" />
      <Input
        ref={ref}
        type="search"
        value={local}
        placeholder="Cari produk, listing, atau kode..."
        className="pl-11 pr-12"
        onChange={(e) => {
          const next = e.currentTarget.value;
          setLocal(next);
          debounced(next);
        }}
      />
    </div>
  );
}
