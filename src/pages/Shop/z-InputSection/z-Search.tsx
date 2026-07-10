import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Output, type OutputHandle } from "./z-Output";
import { useCallback, useRef, useState } from "react";
import { Kbd } from "~/components/ui/kdb";
import { Product } from "~/services/product";
import { cn } from "~/lib/utils";
import { useBuildIndex } from "./use-build-index";

type Props = {
  products: Product[];
  onSelect: (product: Product) => void;
};

export function Search({ products, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<OutputHandle>(null);
  const filteredRef = useRef<Product[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const search = useBuildIndex(products);
  const open = filtered.length > 0 && isFocused;
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const query = e.currentTarget.value;
      setQuery(query);
      if (query.trim() === "") {
        filteredRef.current = [];
        setFiltered([]);
        return;
      }
      const result = search(query);
      filteredRef.current = result;
      setFiltered(result);
    },
    [search],
  );
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const current = filteredRef.current;
      if (current.length === 0) {
        setError("Barang tidak ditemukan");
        return;
      }
      onSelect(current[0]);
      filteredRef.current = [];
      setQuery("");
      setFiltered([]);
      setError(null);
      inputRef.current?.blur();
    },
    [onSelect],
  );
  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-end gap-1 px-1 relative z-20">
        <label className="flex flex-col gap-1 w-full">
          <div>
            <span>
              Cari: <Kbd>F1</Kbd>
            </span>
          </div>
          <Input
            ref={inputRef}
            type="search"
            id="searchbar"
            value={query}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-autocomplete="list"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                outputRef.current?.focusFirst();
              }
            }}
          />
          <TextError>{error}</TextError>
        </label>
      </form>
      <div
        className={cn("absolute inset-0 z-10", { hidden: !open })}
        onClick={() => inputRef.current?.blur()}
      />
      <Output
        ref={outputRef}
        products={filtered}
        className={cn({ hidden: !open })}
        onClick={onSelect}
      />
    </div>
  );
}
