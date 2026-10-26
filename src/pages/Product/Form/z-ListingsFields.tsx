import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Input } from "~/components/ui/input";
import { NumberField } from "~/components/NumberField";
import { getProductKind } from "~/lib/constants";
import { LISTING_KIND_SUGGESTIONS, type ListingDraft } from "./types";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { PendingCombobox, PendingInput, PendingNumber } from "./z-Pending";
import { Section, SectionAdd } from "./z-Section";

type ListingError = { name?: string; price?: string; unit?: string } | undefined;

const KIND_OPTIONS: ComboboxOption[] = LISTING_KIND_SUGGESTIONS.map((kind) => ({
  value: kind,
  label: getProductKind(kind),
}));

/** The section's static half, shared with the detail form's pending shape. */
export const LISTINGS_SECTION = {
  title: "Listing",
  description: "Minimal satu listing. Satu listing = satu satuan jual (mis. eceran, grosir).",
} as const;

/**
 * A listing row's words. The pending row below reads them from here too, so the
 * form and its placeholder cannot drift apart — not in a label, not in a hint,
 * not in the placeholder an empty control shows.
 */
const LISTING_ROW = {
  title: (index: number) => `Listing ${index + 1}`,
  name: { label: "Nama", placeholder: "cth. Eceran" },
  price: { label: "Harga", placeholder: "0" },
  unit: { label: "Satuan (× pcs)", hint: "1 = 1 pcs, 12 = 1 lusin" },
  kind: {
    label: "Jenis",
    hint: "Bebas dikosongkan",
    placeholder: "cth. Ecer, karton",
    aria: "Jenis listing",
  },
  code: {
    label: "Kode",
    hint: "Unik; kosongkan bila tanpa kode",
    placeholder: "Barcode / QR / SKU",
  },
  remove: "Hapus listing",
} as const;

export function ListingsFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  const { draft, errors } = form;

  return (
    <Section
      {...LISTINGS_SECTION}
      error={errors.listings}
      action={<SectionAdd onClick={form.addListing} disabled={disabled} />}
    >
      <div className="flex flex-col gap-3">
        {draft.listings.map((listing, index) => (
          <ListingRow
            key={listing.key}
            listing={listing}
            index={index}
            error={errors.listingErrors?.[listing.key]}
            disabled={disabled}
            canRemove={draft.listings.length > 1}
            onChange={(patch) => form.updateListing(listing.key, patch)}
            onRemove={() => form.removeListing(listing.key)}
          />
        ))}
      </div>
    </Section>
  );
}

/** The row wrapper both the real row and its placeholder are built in. */
const ROW = "flex flex-col gap-3 rounded-lg border bg-background/50 p-3";
const ROW_FIELDS = "grid grid-cols-2 gap-3 md:grid-cols-4";

function ListingRow({
  listing,
  index,
  error,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: {
  listing: ListingDraft;
  index: number;
  error: ListingError;
  disabled?: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<ListingDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={ROW}>
      <div className="flex items-center justify-between">
        <span className="text-small font-medium text-muted-foreground">
          {LISTING_ROW.title(index)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="size-11 small:size-9"
          disabled={disabled || !canRemove}
          onClick={onRemove}
          aria-label={LISTING_ROW.remove}
        >
          <Trash2 className="icon" />
        </Button>
      </div>
      <div className={ROW_FIELDS}>
        <Field label={LISTING_ROW.name.label} error={error?.name} className="col-span-2">
          <Input
            value={listing.name}
            disabled={disabled}
            onChange={(e) => onChange({ name: e.currentTarget.value })}
            placeholder={LISTING_ROW.name.placeholder}
          />
        </Field>
        <Field label={LISTING_ROW.price.label} error={error?.price}>
          <NumberField
            value={listing.price}
            disabled={disabled}
            onValueChange={(price) => onChange({ price })}
            placeholder={LISTING_ROW.price.placeholder}
          />
        </Field>
        <Field
          label={LISTING_ROW.unit.label}
          error={error?.unit}
          hint={LISTING_ROW.unit.hint}
        >
          <Input
            type="number"
            min={1}
            step={1}
            value={listing.unit}
            disabled={disabled}
            onChange={(e) => onChange({ unit: e.currentTarget.value })}
          />
        </Field>
        <Field
          label={LISTING_ROW.kind.label}
          hint={LISTING_ROW.kind.hint}
          className="col-span-2"
        >
          <Combobox
            value={listing.kind}
            disabled={disabled}
            onValueChange={(kind) => onChange({ kind })}
            options={KIND_OPTIONS}
            placeholder={LISTING_ROW.kind.placeholder}
            aria-label={LISTING_ROW.kind.aria}
          />
        </Field>
        <Field
          label={LISTING_ROW.code.label}
          hint={LISTING_ROW.code.hint}
          className="col-span-2"
        >
          <Input
            value={listing.code}
            disabled={disabled}
            onChange={(e) => onChange({ code: e.currentTarget.value })}
            placeholder={LISTING_ROW.code.placeholder}
          />
        </Field>
      </div>
    </div>
  );
}

/**
 * The row before the listing's values: the same wrapper, the same title, the
 * same grid and the same words — every control is its real box, empty and
 * pulsing. Nothing about a listing row is guessed, because nothing about it is
 * re-written: the labels and the layout come from `LISTING_ROW` and `ROW_FIELDS`.
 */
export function ListingRowSkeleton({ index }: { index: number }) {
  return (
    <div className={ROW}>
      <div className="flex items-center justify-between">
        <span className="text-small font-medium text-muted-foreground">
          {LISTING_ROW.title(index)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="size-11 small:size-9"
          disabled
          aria-label={LISTING_ROW.remove}
        >
          <Trash2 className="icon" />
        </Button>
      </div>
      <div className={ROW_FIELDS}>
        <Field label={LISTING_ROW.name.label} className="col-span-2">
          <PendingInput placeholder={LISTING_ROW.name.placeholder} />
        </Field>
        <Field label={LISTING_ROW.price.label}>
          <PendingNumber placeholder={LISTING_ROW.price.placeholder} />
        </Field>
        <Field label={LISTING_ROW.unit.label} hint={LISTING_ROW.unit.hint}>
          <PendingInput type="number" />
        </Field>
        <Field label={LISTING_ROW.kind.label} hint={LISTING_ROW.kind.hint} className="col-span-2">
          <PendingCombobox
            options={KIND_OPTIONS}
            placeholder={LISTING_ROW.kind.placeholder}
            ariaLabel={LISTING_ROW.kind.aria}
          />
        </Field>
        <Field label={LISTING_ROW.code.label} hint={LISTING_ROW.code.hint} className="col-span-2">
          <PendingInput placeholder={LISTING_ROW.code.placeholder} />
        </Field>
      </div>
    </div>
  );
}
