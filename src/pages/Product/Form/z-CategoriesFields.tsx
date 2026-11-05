import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { pageData as categoryData } from "~/pages/Category/data";
import { service } from "~/services";
import type { ProductFormController } from "./useProductForm";
import { Section, useFlatSection } from "./z-Section";

/** The section's static half, shared with the detail form's pending shape. */
export const CATEGORIES_SECTION = {
  title: "Kategori",
  description: "Satu produk boleh masuk beberapa kategori.",
} as const;

/**
 * The product's categories, as ticks.
 *
 * The list is its own read: categories are a separate table with their own live
 * stream, so it gates itself inside the section while the section's frame is drawn.
 * It registers `CategoryPage`'s key — the same instance, so the picker and the
 * category screen share one cache entry rather than reading the same table twice.
 * The ticks are the form's draft, so an untick is undoable like every other edit.
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
          error={() => (
            <p className="text-sm text-destructive">Kategori gagal dimuat.</p>
          )}
        >
          {({ categories }) =>
            categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada kategori. Tambahkan di halaman Kategori.
              </p>
            ) : (
              <div className={cn("flex flex-wrap gap-x-5 gap-y-2", flat && "py-1")}>
                {categories.map((category) => {
                  const checked = form.draft.categories.includes(category.id);
                  const id = `product-category-${category.id}`;
                  return (
                    <Label
                      key={category.id}
                      htmlFor={id}
                      className="flex items-center gap-2 text-sm font-normal"
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => form.toggleCategory(category.id)}
                      />
                      {category.name}
                    </Label>
                  );
                })}
              </div>
            )
          }
        </categoryData.Gate>
      </categoryData.Provider>
    </Section>
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
