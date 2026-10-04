import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { NumberField } from "~/components/NumberField";
import type { StockDraft } from "./types";
import { parseNumber } from "./types";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { Section } from "./z-Section";

export function StocksFields({
  form,
  disabled,
  lockedKeys,
}: {
  form: ProductFormController;
  disabled?: boolean;
  /** Stock ids that cannot be removed (already persisted lots in edit mode). */
  lockedKeys?: Set<string>;
}) {
  const { draft, errors } = form;

  const total = draft.stocks.reduce((sum, stock) => sum + parseNumber(stock.value), 0);
  const totalValue = draft.stocks.reduce(
    (sum, stock) => sum + parseNumber(stock.value) * parseNumber(stock.capital),
    0,
  );
  const average = total > 0 ? totalValue / total : 0;

  return (
    <Section
      title="Stok"
      description="Minimal satu lot. Setiap lot punya jumlah dan modal per pcs sendiri."
      error={errors.stocks}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled}
          onClick={form.addStock}
        >
          <Plus className="size-4" /> Tambah lot
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {draft.stocks.map((stock, index) => (
          <StockRow
            key={stock.key}
            stock={stock}
            index={index}
            error={errors.stockErrors?.[stock.key]}
            disabled={disabled}
            canRemove={draft.stocks.length > 1 && !(lockedKeys?.has(stock.key) ?? false)}
            onChange={(patch) => form.updateStock(stock.key, patch)}
            onRemove={() => form.removeStock(stock.key)}
          />
        ))}
      </div>
      <p className="text-normal text-muted-foreground">
        Total {total.toLocaleString("id-ID")} pcs · Rata-rata modal{" "}
        {average.toLocaleString("id-ID")} · Nilai {totalValue.toLocaleString("id-ID")}
      </p>
    </Section>
  );
}

function StockRow({
  stock,
  index,
  error,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: {
  stock: StockDraft;
  index: number;
  error: { value?: string; capital?: string } | undefined;
  disabled?: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<StockDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-end gap-3 rounded-lg border bg-background/50 p-3">
      <Field label={`Jumlah lot ${index + 1} (pcs)`} error={error?.value} className="flex-1">
        <NumberField
          value={stock.value}
          disabled={disabled}
          onValueChange={(value) => onChange({ value })}
          placeholder="0"
        />
      </Field>
      <Field label="Modal / pcs" error={error?.capital} className="flex-1">
        <NumberField
          value={stock.capital}
          disabled={disabled}
          onValueChange={(capital) => onChange({ capital })}
          placeholder="0"
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || !canRemove}
        onClick={onRemove}
        aria-label="Hapus lot"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
