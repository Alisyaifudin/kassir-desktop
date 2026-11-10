import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getProductKind } from "~/lib/constants";
import { pageData } from "./data";
import { availableKinds } from "./use-filtered";
import type {
  ListState,
  ListStatePatch,
  MarginFilter,
  PublishFilter,
  StockFilter,
} from "./use-list-state";

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

const PUBLISH_LABELS: Record<PublishFilter, string> = {
  all: "Semua",
  published: "Terbit",
  unpublished: "Belum terbit",
};

/**
 * One row of the filter: a label plus a horizontal set of segmented tabs. The
 * value is applied as soon as it is picked, so there is nothing to submit —
 * Radix Tabs is used purely as a single-choice control here, no panels.
 */
function Choice<T extends string>({
  label,
  value,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
        <TabsList className="h-fit w-full">
          {(Object.keys(labels) as T[]).map((option) => (
            <TabsTrigger key={option} value={option} className="flex-1 py-2 text-sm">
              {labels[option]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

export function Filter({
  state,
  set,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  const activeCount =
    state.kinds.length +
    (state.stock !== "all" ? 1 : 0) +
    (state.margin !== "all" ? 1 : 0) +
    (state.publish !== "all" ? 1 : 0);

  const toggleKind = (kind: string) => {
    const next = state.kinds.includes(kind)
      ? state.kinds.filter((current) => current !== kind)
      : [...state.kinds, kind];
    set({ kinds: next });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2 text-base">
          <SlidersHorizontal className="size-5" />
          Filter
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-sm text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-w-sm flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-2xl">Filter</DialogTitle>
        </DialogHeader>

        {/* The only data in this dialog: which labels the catalog actually
            uses. Absent until they arrive, exactly as it always was — the rest
            of the filter works without them. */}
        <pageData.Gate keys={["products"]} delay={0} pulse={null} error={null}>
          {({ products }) => {
            const kinds = availableKinds(products);
            if (kinds.length === 0) return null;
            return (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Jenis</span>
                <div className="flex flex-col gap-2">
                  {kinds.map((kind) => (
                    <Label key={kind} className="flex cursor-pointer items-center gap-2 text-sm">
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

        <Choice
          label="Status"
          value={state.publish}
          labels={PUBLISH_LABELS}
          onChange={(publish) => set({ publish })}
        />

        <Choice
          label="Stok"
          value={state.stock}
          labels={STOCK_LABELS}
          onChange={(stock) => set({ stock })}
        />

        <Choice
          label="Margin"
          value={state.margin}
          labels={MARGIN_LABELS}
          onChange={(margin) => set({ margin })}
        />

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-sm"
            disabled={activeCount === 0}
            onClick={() => set({ kinds: [], stock: "all", margin: "all", publish: "all" })}
          >
            Reset
          </Button>
          <DialogClose asChild>
            <Button type="button" className="h-11 text-sm">
              Selesai
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
