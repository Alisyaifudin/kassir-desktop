import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
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
  availableKinds,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
  availableKinds: string[];
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
        <Button type="button" variant="outline" className="gap-2">
          <SlidersHorizontal className="size-4" />
          Filter
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-4">
        {availableKinds.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-normal font-medium">Jenis</span>
            <div className="flex flex-col gap-2">
              {availableKinds.map((kind) => (
                <Label key={kind} className="flex cursor-pointer items-center gap-2 text-normal">
                  <Checkbox
                    checked={state.kinds.includes(kind)}
                    onCheckedChange={() => toggleKind(kind)}
                  />
                  {kind}
                </Label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <span className="text-normal font-medium">Stok</span>
          <RadioGroup
            value={state.stock}
            onValueChange={(value) => set({ stock: value as StockFilter })}
            className="flex flex-col gap-2"
          >
            {(Object.keys(STOCK_LABELS) as StockFilter[]).map((value) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 text-normal">
                <RadioGroupItem value={value} /> {STOCK_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-normal font-medium">Margin</span>
          <RadioGroup
            value={state.margin}
            onValueChange={(value) => set({ margin: value as MarginFilter })}
            className="flex flex-col gap-2"
          >
            {(Object.keys(MARGIN_LABELS) as MarginFilter[]).map((value) => (
              <Label key={value} className="flex cursor-pointer items-center gap-2 text-normal">
                <RadioGroupItem value={value} /> {MARGIN_LABELS[value]}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <Button
          type="button"
          variant="ghost"
          disabled={activeCount === 0}
          onClick={() => set({ kinds: [], stock: "all", margin: "all" })}
        >
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
}
