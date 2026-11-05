import { useState } from "react";
import { Effect, Either } from "effect";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { categoryMessage } from "~/pages/Category/util-category";
import { service } from "~/services";
import type { ProductFull, ProductInput } from "~/services/product";
import { draftFromProduct } from "./types";
import { useProductForm } from "./useProductForm";
import { CategoriesFields } from "./z-CategoriesFields";
import { InfoFields } from "./z-InfoFields";
import { ListingsFields } from "./z-ListingsFields";
import { PropertiesFields } from "./z-PropertiesFields";
import { StocksFields } from "./z-StocksFields";

export function ProductForm({
  initial,
  pending,
  error,
  duplicateCode,
  submitLabel = "Simpan",
  onSubmit,
  onCancel,
}: {
  initial?: ProductFull;
  pending: boolean;
  error?: string | null;
  duplicateCode?: string | null;
  submitLabel?: string;
  onSubmit: (input: ProductInput) => void;
  onCancel?: () => void;
}) {
  const form = useProductForm(initial === undefined ? undefined : draftFromProduct(initial));
  // The parent's `pending` covers `product.add`; these two cover the creates that
  // have to land before it, so the button cannot be pressed twice mid-sequence.
  const [busy, setBusy] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const locked = pending || busy;

  /**
   * A name typed in the picker has no id until something creates it, and
   * `product.add` needs ids — so the create runs first and the product is filed
   * under what it returned: one submit, two writes, in that order.
   *
   * Not one transaction: the product does not exist yet, so there is nothing to
   * hang the category off. A product the database then refuses (a duplicate code)
   * leaves behind the category it was going to be filed under — a row on the
   * Category screen, which is where it can be removed.
   */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = form.buildInput();
    if (input === null) return;

    const names = form.draft.newCategories;
    if (names.length === 0) {
      onSubmit(input);
      return;
    }

    setBusy(true);
    setCategoryError(null);
    const created = await Effect.runPromise(
      Effect.all(
        names.map((name) => service.category.add({ name })),
        { concurrency: 1 },
      ).pipe(Effect.either),
    );
    setBusy(false);
    if (Either.isLeft(created)) {
      setCategoryError(categoryMessage(created.left) ?? "Kategori gagal disimpan.");
      return;
    }
    onSubmit({ ...input, categoryIds: [...(input.categoryIds ?? []), ...created.right] });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InfoFields form={form} disabled={locked} />
      <CategoriesFields form={form} disabled={locked} />
      <ListingsFields form={form} disabled={locked} />
      <StocksFields form={form} disabled={locked} />
      <PropertiesFields form={form} disabled={locked} />
      <TextError>{error}</TextError>
      <TextError>{categoryError}</TextError>
      <TextError>
        {duplicateCode ? `Kode "${duplicateCode}" sudah dipakai produk lain.` : null}
      </TextError>
      <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={locked}>
            Batal
          </Button>
        ) : null}
        <Button type="submit" disabled={locked}>
          {submitLabel}
          <Spinner when={locked} />
        </Button>
      </div>
    </form>
  );
}
