import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { SearchIcon, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [local, setLocal] = useState(value);
  const debounced = useDebouncedCallback(onChange, DEBOUNCE_DELAY);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative flex min-w-[180px] flex-1 items-center">
      <SearchIcon className="absolute left-3 size-6 text-muted-foreground small:size-5" />
      <Input
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
      {local !== "" ? (
        <Button
          type="button"
          variant="ghost"
          className="absolute right-1.5 size-10 small:size-7"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
        >
          <X className="icon" />
        </Button>
      ) : null}
    </div>
  );
}
