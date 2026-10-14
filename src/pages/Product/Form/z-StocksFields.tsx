import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { NumberField } from "~/components/NumberField";
import { cn } from "~/lib/utils";
import type { StockDraft } from "./types";
import { parseNumber } from "./types";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { Section } from "./z-Section";

export function StocksFields({
  form,
  disabled,
  lockedKeys,
  onAdjustValue,
}: {
  form: ProductFormController;
  disabled?: boolean;
  /** Stock ids that cannot be removed (already persisted lots in edit mode). */
  lockedKeys?: Set<string>;
  /**
   * Persisted lots render their quantity as plain, clickable text that opens the
   * manual inc/dec dialog instead of an editable input. Unsaved lots ("Tambah
   * lot") stay editable so their opening quantity can be entered.
   */
  onAdjustValue?: (stock: StockDraft, index: number) => void;
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
      description="Minimal satu lot. Setiap lot punya jumlah dan modal per pcs sendiri. Klik jumlah pada lot tersimpan untuk menambah atau mengurangi stok."
      error={errors.stocks}
      action={
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1 text-small small:h-9"
          disabled={disabled}
          onClick={form.addStock}
        >
          <Plus className="icon" /> Tambah lot
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
            adjustable={onAdjustValue !== undefined && (lockedKeys?.has(stock.key) ?? false)}
            onAdjust={onAdjustValue ? () => onAdjustValue(stock, index) : undefined}
            onChange={(patch) => form.updateStock(stock.key, patch)}
            onRemove={() => form.removeStock(stock.key)}
          />
        ))}
      </div>
      <p className="text-small text-muted-foreground">
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
  adjustable,
  onAdjust,
  onChange,
  onRemove,
}: {
  stock: StockDraft;
  index: number;
  error: { value?: string; capital?: string } | undefined;
  disabled?: boolean;
  canRemove: boolean;
  adjustable: boolean;
  onAdjust?: () => void;
  onChange: (patch: Partial<StockDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-end gap-3 rounded-lg border bg-background/50 p-3">
      <Field label={`Jumlah lot ${index + 1} (pcs)`} error={error?.value} className="flex-1">
        {adjustable ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAdjust}
            title="Sesuaikan stok (tambah / kurang)"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 py-1 text-left text-normal tabular-nums shadow-sm transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span>{parseNumber(stock.value).toLocaleString("id-ID")}</span>
            <Pencil className="icon shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <NumberField
            value={stock.value}
            disabled={disabled}
            onValueChange={(value) => onChange({ value })}
            placeholder="0"
          />
        )}
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
        className="size-11 small:size-9"
        disabled={disabled || !canRemove}
        onClick={onRemove}
        aria-label="Hapus lot"
      >
        <Trash2 className="icon" />
      </Button>
    </div>
  );
}
