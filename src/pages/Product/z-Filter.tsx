import { useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TextError } from "~/components/TextError";
import { getProductKind } from "~/lib/constants";
import type { Category } from "~/services/category";
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
    state.categories.length +
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
      <DialogContent
        className="flex max-h-[85vh] max-w-sm flex-col gap-4 overflow-y-auto"
        // The category picker's list is a Radix Popover, portaled out of this
        // dialog — so Radix reads a press in it as an interaction outside and
        // would close the dialog on the very pick that was being made. It is the
        // dialog's own control, not a dismissal.
        onInteractOutside={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("[data-combobox-list]") !== null) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Filter</DialogTitle>
          <DialogDescription>
            Saring katalog per jenis, kategori, status, stok, dan margin. Setiap pilihan langsung
            berlaku.
          </DialogDescription>
        </DialogHeader>

        {/* The `kind` labels the catalog actually uses. Absent until they arrive,
            exactly as it always was — the rest of the filter works without them. */}
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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Kategori</span>
          {/* The categories are another service's read, and the dialog is opened
              by the operator rather than by the page load — so it gates itself
              here, holding the picker's line while the list arrives. */}
          <pageData.Gate
            keys={["categories"]}
            delay={0}
            pulse={<Skeleton className="h-9 w-full" />}
            error={() => <TextError>Kategori gagal dimuat.</TextError>}
          >
            {({ categories }) => (
              <CategoryPicks categories={categories} state={state} set={set} />
            )}
          </pageData.Gate>
        </div>

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
            onClick={() =>
              set({ kinds: [], categories: [], stock: "all", margin: "all", publish: "all" })
            }
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

/**
 * The category filter: a picker, and a badge per pick under it.
 *
 * The field is an `adder` — it holds no value of its own, because the picks are
 * the answer and they are shown as badges. Each pick is applied immediately like
 * every other control in the dialog; an empty set is "no category filter", so
 * removing the last badge is how the filter is dropped.
 *
 * A picked id the catalogue does not name is not drawn: it is a category this
 * device has not received yet (or one deleted elsewhere), and a filter cannot be
 * explained — let alone un-picked — by a name nobody has.
 */
function CategoryPicks({
  categories,
  state,
  set,
}: {
  categories: Category[];
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  const picked = state.categories;

  const byId = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  // Only what the filter does not already hold: picking a badge again is a no-op,
  // so the list should not invite it.
  const options = useMemo<ComboboxOption[]>(
    () =>
      categories
        .filter((category) => !picked.includes(category.id))
        .map((category) => ({ value: category.id, label: category.name })),
    [categories, picked],
  );

  const toggle = (id: string) => {
    set({
      categories: picked.includes(id)
        ? picked.filter((current) => current !== id)
        : [...picked, id],
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Combobox
        value=""
        onValueChange={toggle}
        options={options}
        adder
        placeholder="Pilih kategori..."
        aria-label="Pilih kategori"
        emptyText="Tidak ada kategori lain"
      />

      {picked.length === 0 ? null : (
        <ul className="flex flex-wrap gap-2" aria-label="Kategori terpilih">
          {picked.map((id) => {
            const category = byId.get(id);
            if (category === undefined) return null;
            return (
              <li key={id}>
                <Badge variant="secondary" className="max-w-full pr-1">
                  <span className="truncate">{category.name}</span>
                  <button
                    type="button"
                    aria-label={`Lepas kategori ${category.name}`}
                    onClick={() => toggle(id)}
                    className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
                  >
                    <X className="size-3.5" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
