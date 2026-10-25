import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { SkeletonText } from "~/components/ui/skeleton";
import { NumberField } from "~/components/NumberField";
import { cn } from "~/lib/utils";
import { foldedLabel, groupStocks } from "./stock-groups";
import type { StockDraft } from "./types";
import { parseNumber } from "./types";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { PendingNumber } from "./z-Pending";
import { Section, SectionAdd } from "./z-Section";

/** The section's static half, shared with the detail form's pending shape. */
export const STOCKS_SECTION = {
  title: "Stok",
  description:
    "Minimal satu lot. Setiap lot punya jumlah dan modal per pcs sendiri. Klik jumlah pada lot tersimpan untuk menambah atau mengurangi stok.",
} as const;

/** A lot row's words. The pending row reads them from here too. */
export const STOCK_ROW = {
  value: (index: number) => `Jumlah lot ${index + 1} (pcs)`,
  capital: "Modal / pcs",
  placeholder: "0",
  adjust: "Sesuaikan stok (tambah / kurang)",
  remove: "Hapus lot",
} as const;

/** The words of the section's foot line, whose three figures are values. */
const STOCK_TOTALS = { total: "Total", unit: "pcs", average: "Rata-rata modal", value: "Nilai" };

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

  // Sold-out lots fold away; a lot still being typed into never does. Only a
  // persisted lot is folded, which is exactly the read-only rows of the detail
  // pane — the place a long-lived product accumulates them.
  const { active, folded } = groupStocks(
    draft.stocks,
    (stock) => lockedKeys?.has(stock.key) ?? false,
  );
  // A sold-out lot can still be wrong (a typed negative quantity): the accordion
  // must never be the thing hiding the row that is complaining.
  const foldedHasError = folded.some((stock) => errors.stockErrors?.[stock.key] !== undefined);
  const [showFolded, setShowFolded] = useState(false);
  useEffect(() => {
    if (foldedHasError) setShowFolded(true);
  }, [foldedHasError]);

  function row(stock: StockDraft) {
    // The label numbers the lot, so it keeps its place in the whole list even
    // when its neighbours are folded away — two rows both saying "lot 1" would
    // read as a mistake.
    const index = draft.stocks.indexOf(stock);
    return (
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
    );
  }

  return (
    <Section
      {...STOCKS_SECTION}
      error={errors.stocks}
      action={<SectionAdd label="Tambah lot" onClick={form.addStock} disabled={disabled} />}
    >
      <div className="flex flex-col gap-3">
        {active.map(row)}
        {folded.length === 0 ? null : (
          <Accordion
            type="single"
            collapsible
            // Controlled, so an error inside can force it open. `""` is this
            // component's "closed" — Radix's single-collapsible value.
            value={showFolded ? "folded" : ""}
            onValueChange={(value) => setShowFolded(value === "folded")}
            className="rounded-lg border bg-muted/20 px-3"
          >
            <AccordionItem value="folded" className="border-b-0">
              <AccordionTrigger className="py-2 text-small text-muted-foreground hover:no-underline">
                {foldedLabel(folded)}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">{folded.map(row)}</AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
      <StockTotals
        total={total.toLocaleString("id-ID")}
        average={average.toLocaleString("id-ID")}
        value={totalValue.toLocaleString("id-ID")}
      />
    </Section>
  );
}

/**
 * The section's foot line. Its three words are static — the form and the pending
 * shape draw the same sentence — and only the figures between them wait.
 */
function StockTotals({
  total,
  average,
  value,
}: {
  total?: string;
  average?: string;
  value?: string;
}) {
  return (
    <p className="text-small text-muted-foreground">
      {STOCK_TOTALS.total} {total ?? <SkeletonText className="w-8" />} {STOCK_TOTALS.unit} ·{" "}
      {STOCK_TOTALS.average} {average ?? <SkeletonText className="w-10" />} ·{" "}
      {STOCK_TOTALS.value} {value ?? <SkeletonText className="w-12" />}
    </p>
  );
}

const ROW = "flex items-end gap-3 rounded-lg border bg-background/50 p-3";

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
    <div className={ROW}>
      <Field label={STOCK_ROW.value(index)} error={error?.value} className="flex-1">
        {adjustable ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAdjust}
            title={STOCK_ROW.adjust}
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
            placeholder={STOCK_ROW.placeholder}
          />
        )}
      </Field>
      <Field label={STOCK_ROW.capital} error={error?.capital} className="flex-1">
        <NumberField
          value={stock.capital}
          disabled={disabled}
          onValueChange={(capital) => onChange({ capital })}
          placeholder={STOCK_ROW.placeholder}
        />
      </Field>
      <Button
        type="button"
        variant="ghost"
        className="size-11 small:size-9"
        disabled={disabled || !canRemove}
        onClick={onRemove}
        aria-label={STOCK_ROW.remove}
      >
        <Trash2 className="icon" />
      </Button>
    </div>
  );
}

/**
 * The row before the lot's values: the same wrapper, the same labels, the same
 * two number boxes, empty and pulsing, and the section's foot line with its
 * figures missing.
 */
export function StockRowSkeleton({ index }: { index: number }) {
  return (
    <>
      <div className={ROW}>
        <Field label={STOCK_ROW.value(index)} className="flex-1">
          <PendingNumber placeholder={STOCK_ROW.placeholder} />
        </Field>
        <Field label={STOCK_ROW.capital} className="flex-1">
          <PendingNumber placeholder={STOCK_ROW.placeholder} />
        </Field>
        <Button
          type="button"
          variant="ghost"
          className="size-11 small:size-9"
          disabled
          aria-label={STOCK_ROW.remove}
        >
          <Trash2 className="icon" />
        </Button>
      </div>
      <StockTotals />
    </>
  );
}
