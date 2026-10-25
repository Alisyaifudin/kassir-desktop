import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { getProductKind } from "~/lib/constants";
import { pageData } from "./data";
import { availableKinds } from "./use-filtered";
import type { ListState, ListStatePatch, MarginFilter, StockFilter } from "./use-list-state";

const STOCK_LABELS: Record<StockFilter, string> = {
  all: "Semua",
  in: "Ada",
  low: "Menipis",
  out: "Habis",
};

const MARGIN_LABELS: Record<MarginFilter, string> = {
  all: "Semua",
  profit: "Untung",
  loss: "Rugi",
};

export function Filter({
  state,
  set,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  const activeCount =
    state.kinds.length + (state.stock !== "all" ? 1 : 0) + (state.margin !== "all" ? 1 : 0);

  const toggleKind = (kind: string) => {
    const next = state.kinds.includes(kind)
      ? state.kinds.filter((current) => current !== kind)
      : [...state.kinds, kind];
    set({ kinds: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="gap-2 text-normal small:h-10">
          <SlidersHorizontal className="icon" />
          Filter
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-small text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-4 small:w-60">
        {/* The only data in this popover: which labels the catalog actually
            uses. Absent until they arrive, exactly as it always was — the rest
            of the filter works without them. */}
        <pageData.Gate keys={["products"]} delay={0} pulse={null} error={null}>
          {({ products }) => {
            const kinds = availableKinds(products);
            if (kinds.length === 0) return null;
            return (
              <div className="flex flex-col gap-2">
                <span className="text-small font-medium">Jenis</span>
                <div className="flex flex-col gap-2">
                  {kinds.map((kind) => (
                    <Label key={kind} className="flex cursor-pointer items-center gap-2 text-small">
                      <Checkbox
                        checked={state.kinds.includes(kind)}
                        onCheckedChange={() => toggleKind(kind)}
                      />
                      {getProductKind(kind)}
                    </Label>
                  ))}
                </div>
              </div>
            );
          }}
        </pageData.Gate>

        <div className="flex flex-col gap-2">
          <span className="text-small font-medium">Stok</span>
          <RadioGroup
            value={state.stock}
            onValueChange={(value) => set({ stock: value as StockFilter })}
            className="flex flex-col gap-2"
          >
            {(Object.keys(STOCK_LABELS) as StockFilter[]).map((value) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 text-small">
                <RadioGroupItem value={value} /> {STOCK_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small font-medium">Margin</span>
          <RadioGroup
            value={state.margin}
            onValueChange={(value) => set({ margin: value as MarginFilter })}
            className="flex flex-col gap-2"
          >
            {(Object.keys(MARGIN_LABELS) as MarginFilter[]).map((value) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 text-small">
                <RadioGroupItem value={value} /> {MARGIN_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="h-11 text-small small:h-9"
          disabled={activeCount === 0}
          onClick={() => set({ kinds: [], stock: "all", margin: "all" })}
        >
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
}
