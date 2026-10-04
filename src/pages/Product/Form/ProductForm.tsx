import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import type { ProductFull, ProductInput } from "~/services/product";
import { draftFromProduct } from "./types";
import { useProductForm } from "./useProductForm";
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = form.buildInput();
    if (input !== null) onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InfoFields form={form} disabled={pending} />
      <ListingsFields form={form} disabled={pending} />
      <StocksFields form={form} disabled={pending} />
      <PropertiesFields form={form} disabled={pending} />
      <TextError>{error}</TextError>
      <TextError>
        {duplicateCode ? `Kode "${duplicateCode}" sudah dipakai produk lain.` : null}
      </TextError>
      <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Batal
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {submitLabel}
          <Spinner when={pending} />
        </Button>
      </div>
    </form>
  );
}
