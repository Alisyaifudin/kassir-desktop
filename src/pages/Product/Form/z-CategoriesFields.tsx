import { useMemo } from "react";
import { X } from "lucide-react";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { pageData as categoryData } from "~/pages/Category/data";
import { service } from "~/services";
import type { Category } from "~/services/category";
import type { ProductFormController } from "./useProductForm";
import { Section, useFlatSection } from "./z-Section";

/** The section's static half, shared with the detail form's pending shape. */
export const CATEGORIES_SECTION = {
  title: "Kategori",
  description: "Satu produk boleh masuk beberapa kategori.",
} as const;

/**
 * The product's categories: a badge per pick, and a picker that adds more.
 *
 * The list is its own read: categories are a separate table with their own live
 * stream, so it gates itself inside the section while the section's frame is
 * drawn. It registers `CategoryPage`'s key — the same instance, so the picker and
 * the category screen share one cache entry rather than reading the same table
 * twice.
 *
 * Everything here is the form's draft, including a name the catalogue does not
 * hold yet: that one is a badge with a dashed edge until `Simpan`, which creates
 * the row and files the product under it. So a name typed and thought better of
 * costs the catalogue nothing, and an un-pick is undoable like every other edit.
 *
 * An id in the draft whose category is not in the list is **not** drawn and not
 * removed: that is a link to a category this device has not received yet (or one
 * that was deleted elsewhere), and a save must not drop it silently. The service
 * writes exactly the ids it is handed.
 */
export function CategoriesFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  const flat = useFlatSection();

  return (
    <Section {...CATEGORIES_SECTION}>
      <categoryData.Provider sources={{ categories: service.category.get.changes }}>
        <categoryData.Gate
          keys={["categories"]}
          delay={0}
          pulse={<PendingTicks />}
          error={() => <p className="text-sm text-destructive">Kategori gagal dimuat.</p>}
        >
          {({ categories }) => (
            <CategoryPicker form={form} categories={categories} disabled={disabled} flat={flat} />
          )}
        </categoryData.Gate>
      </categoryData.Provider>
    </Section>
  );
}

function CategoryPicker({
  form,
  categories,
  disabled,
  flat,
}: {
  form: ProductFormController;
  categories: Category[];
  disabled?: boolean;
  flat: boolean;
}) {
  const picked = form.draft.categories;
  const pending = form.draft.newCategories;

  const byId = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  // Only what the product is not filed under: picking a badge again is a no-op, so
  // the list should not invite it. Kept memoized because the field resets its text
  // whenever its options are a new array.
  const options = useMemo<ComboboxOption[]>(
    () =>
      categories
        .filter((category) => !picked.includes(category.id))
        .map((category) => ({ value: category.id, label: category.name })),
    [categories, picked],
  );

  // Every name already on the product, id or pending. Typing one of these is not a
  // new category the field may offer: its badge is right above, and the second row
  // would be the duplicate the table refuses.
  const taken = useMemo(() => {
    const names = new Set(pending.map((name) => name.toLowerCase()));
    for (const id of picked) {
      const category = byId.get(id);
      if (category !== undefined) names.add(category.name.toLowerCase());
    }
    return names;
  }, [pending, picked, byId]);

  return (
    <div className={cn("flex flex-col gap-2", flat && "py-1")}>
      {picked.length === 0 && pending.length === 0 ? null : (
        <ul className="flex flex-wrap gap-2" aria-label="Kategori terpilih">
          {picked.map((id) => {
            const category = byId.get(id);
            // A link this device cannot name is kept, not drawn, not dropped —
            // see the note on `CategoriesFields`.
            if (category === undefined) return null;
            return (
              <li key={id}>
                <CategoryBadge
                  name={category.name}
                  removeLabel={`Lepas kategori ${category.name}`}
                  disabled={disabled}
                  onRemove={() => form.removeCategory(id)}
                />
              </li>
            );
          })}
          {pending.map((name) => (
            <li key={`pending:${name}`}>
              <CategoryBadge
                name={name}
                removeLabel={`Batalkan kategori baru ${name}`}
                disabled={disabled}
                pending
                onRemove={() => form.removeNewCategory(name)}
              />
            </li>
          ))}
        </ul>
      )}

      <Combobox
        // The field is an adder: it holds no value, and a pick is reported as a
        // badge. An unknown name is offered as a row that files it with the next
        // save.
        value=""
        onValueChange={(id) => form.addCategory(id)}
        options={options}
        adder
        disabled={disabled}
        placeholder="Tambah kategori..."
        aria-label="Tambah kategori"
        emptyText="Tidak ada kategori lain"
        createLabel={(text) => (taken.has(text.toLowerCase()) ? null : `Tambahkan "${text}"`)}
        onCreate={(name) => form.addNewCategory(name)}
      />
    </div>
  );
}

/**
 * One picked category.
 *
 * `pending` is the one the catalogue does not have yet — a dashed edge says "this
 * is text until you save", which is also why removing it can only remove text.
 */
function CategoryBadge({
  name,
  removeLabel,
  disabled,
  pending = false,
  onRemove,
}: {
  name: string;
  removeLabel: string;
  disabled?: boolean;
  pending?: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-sm font-medium",
        pending
          ? "border border-dashed border-primary/50 text-primary"
          : "bg-primary/10 text-primary",
      )}
    >
      <span className="truncate">{name}</span>
      <button
        type="button"
        aria-label={removeLabel}
        title={pending ? "Belum disimpan" : undefined}
        disabled={disabled}
        onClick={onRemove}
        className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/** Four ticks' worth of room, so the section does not grow when the list lands. */
function PendingTicks() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2" aria-busy="true" aria-label="Memuat kategori">
      {[56, 72, 64, 88].map((width) => (
        <Skeleton key={width} className="h-5 rounded" style={{ width }} />
      ))}
    </div>
  );
}
