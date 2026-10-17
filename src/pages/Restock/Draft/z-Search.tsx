import { Input } from "~/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { SEARCH_RESULTS } from "../mock";
import { rupiah } from "../util-rupiah";

/**
 * Looks up a product to buy. Adding an existing product is the common case;
 * the manual form in the left column covers things the catalog has never seen.
 */
export function Search() {
  return (
    <div className="flex flex-col gap-1 px-1">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground icon" />
        <Input
          type="search"
          id="restock-search"
          placeholder="Cari barang untuk dibeli..."
          defaultValue=""
          className="pl-8"
          aria-autocomplete="list"
        />
      </div>
      <Results />
    </div>
  );
}

/**
 * The dropdown. Laid out open in the mock so its density can be judged; in the
 * real screen it only appears once the query returns something.
 */
function Results() {
  return (
    <ul
      className="flex flex-col gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
      role="listbox"
    >
      {SEARCH_RESULTS.map((product, i) => (
        <Result key={product.id} index={i} product={product} active={i === 0} />
      ))}
    </ul>
  );
}

function Result({
  product,
  index,
  active,
}: {
  product: (typeof SEARCH_RESULTS)[number];
  index: number;
  active: boolean;
}) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;
  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
          active ? "bg-active text-active-foreground shadow-md" : "hover:bg-accent"
        }`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-small font-semibold text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-small font-medium leading-tight">{product.name}</span>
          <span className="truncate font-mono text-small leading-tight text-muted-foreground">
            {product.barcode || "tanpa kode"}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-small font-bold tabular-nums">{rupiah(product.price)}</span>
          <span
            className={`rounded-full px-1.5 py-px text-small font-medium leading-tight tabular-nums ${
              outOfStock
                ? "bg-destructive/10 text-destructive"
                : lowStock
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {outOfStock ? "Habis" : lowStock ? `Sisa ${product.stock}` : `Stok ${product.stock}`}
          </span>
        </span>
      </button>
    </li>
  );
}
