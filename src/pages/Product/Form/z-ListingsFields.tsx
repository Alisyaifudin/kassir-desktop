import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import { Input } from "~/components/ui/input";
import { NumberField } from "~/components/NumberField";
import { getProductKind } from "~/lib/constants";
import { isSingleListing, LISTING_KIND_SUGGESTIONS, type ListingDraft } from "./types";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { PendingInput, PendingNumber } from "./z-Pending";
import { rowClass, rowsClass, Section, SectionAdd, useFlatSection } from "./z-Section";

type ListingError = { name?: string; price?: string; unit?: string } | undefined;

const KIND_OPTIONS: ComboboxOption[] = LISTING_KIND_SUGGESTIONS.map((kind) => ({
  value: kind,
  label: getProductKind(kind),
}));

/**
 * The section's static half, shared with the detail form's pending shape.
 *
 * It has two shapes because the section has two modes: while the product has one
 * listing that listing *is* the product (see `isSingleListing`), so most of the
 * row disappears; `Tambah` brings the full row back.
 */
export function listingsSection(single: boolean) {
  return {
    title: "Listing",
    description: single
      ? "Nama listing mengikuti nama produk. Klik Tambah untuk harga atau satuan lain."
      : "Minimal satu listing. Satu listing = satu satuan jual (mis. eceran, grosir).",
  };
}

/**
 * A listing row's words. The pending row below reads them from here too, so the
 * form and its placeholder cannot drift apart — not in a label, not in a hint,
 * not in the placeholder an empty control shows.
 */
const LISTING_ROW = {
  title: (index: number) => `Listing ${index + 1}`,
  /** Single mode has no name field; this line says what the name will be. */
  singleName: "Nama listing",
  /** What that line shows while the product has no name yet. */
  noName: "—",
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

/**
 * Two modes, one section: with a single listing the fields *are* the product's
 * (its name is the product name, its `kind` is left as it is), and the moment a
 * second one exists every row is a full listing of its own.
 */
export function ListingsFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  const { draft, errors } = form;
  const flat = useFlatSection();
  const single = isSingleListing(draft.listings);

  return (
    <Section
      {...listingsSection(single)}
      error={errors.listings}
      action={<SectionAdd onClick={form.addListing} disabled={disabled} />}
    >
      <div className={rowsClass(flat)}>
        {single ? (
          <SingleListingRow
            listing={draft.listings[0]}
            productName={draft.name}
            error={errors.listingErrors?.[draft.listings[0].key]}
            disabled={disabled}
            onChange={(patch) => form.updateListing(draft.listings[0].key, patch)}
          />
        ) : (
          draft.listings.map((listing, index) => (
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
          ))
        )}
      </div>
    </Section>
  );
}

/** The row wrapper both the real row and its placeholder are built in. */
const ROW = "flex flex-col gap-3 rounded-lg border bg-background/50 p-3";
const ROW_FLAT = "flex flex-col gap-3 py-3";
const ROW_FIELDS = "grid grid-cols-2 gap-3 md:grid-cols-4";

/**
 * The only listing: price, unit and code, side by side — the row a shop with one
 * price per product actually fills in.
 *
 * There is no name field (the product name is the name, and it is shown in the
 * line above the fields so the value being written is never invisible), no `Jenis`
 * (it is left exactly as the listing already had it, untouched and unshown), and
 * no remove button (the last listing cannot be removed — `Tambah` is what grows
 * the section, and that is what the row is for).
 */
function SingleListingRow({
  listing,
  productName,
  error,
  disabled,
  onChange,
}: {
  listing: ListingDraft;
  productName: string;
  error: ListingError;
  disabled?: boolean;
  onChange: (patch: Partial<ListingDraft>) => void;
}) {
  const flat = useFlatSection();
  return (
    <div className={rowClass(flat, ROW, ROW_FLAT)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {LISTING_ROW.singleName}:{" "}
          <span className="font-medium text-foreground">
            {productName.trim() === "" ? LISTING_ROW.noName : productName.trim()}
          </span>
        </span>
      </div>
      <div className={ROW_FIELDS}>
        <Field label={LISTING_ROW.price.label} error={error?.price}>
          <NumberField
            value={listing.price}
            disabled={disabled}
            onValueChange={(price) => onChange({ price })}
            placeholder={LISTING_ROW.price.placeholder}
          />
        </Field>
        <Field label={LISTING_ROW.unit.label} error={error?.unit} hint={LISTING_ROW.unit.hint}>
          <Input
            type="number"
            min={1}
            step={1}
            value={listing.unit}
            disabled={disabled}
            onChange={(e) => onChange({ unit: e.currentTarget.value })}
          />
        </Field>
        <Field label={LISTING_ROW.code.label} hint={LISTING_ROW.code.hint} className="col-span-2">
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
  const flat = useFlatSection();
  return (
    <div className={rowClass(flat, ROW, ROW_FLAT)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {LISTING_ROW.title(index)}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="size-11"
          disabled={disabled || !canRemove}
          onClick={onRemove}
          aria-label={LISTING_ROW.remove}
        >
          <Trash2 className="size-5" />
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
        <Field label={LISTING_ROW.unit.label} error={error?.unit} hint={LISTING_ROW.unit.hint}>
          <Input
            type="number"
            min={1}
            step={1}
            value={listing.unit}
            disabled={disabled}
            onChange={(e) => onChange({ unit: e.currentTarget.value })}
          />
        </Field>
        <Field label={LISTING_ROW.kind.label} hint={LISTING_ROW.kind.hint} className="col-span-2">
          <Combobox
            value={listing.kind}
            disabled={disabled}
            onValueChange={(kind) => onChange({ kind })}
            options={KIND_OPTIONS}
            placeholder={LISTING_ROW.kind.placeholder}
            aria-label={LISTING_ROW.kind.aria}
          />
        </Field>
        <Field label={LISTING_ROW.code.label} hint={LISTING_ROW.code.hint} className="col-span-2">
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
 * The row before the listing's values: the same wrapper, the same title line, the
 * same grid and the same words — every control is its real box, empty and
 * pulsing. Nothing about a listing row is guessed, because nothing about it is
 * re-written: the labels and the layout come from `LISTING_ROW` and `ROW_FIELDS`.
 *
 * It is drawn in the *single*-listing shape, because that is what a product
 * usually has and because the count is data: a second listing is what `Tambah`
 * makes, and that is the only thing that makes the section taller.
 */
export function ListingRowSkeleton() {
  const flat = useFlatSection();
  return (
    <div className={rowClass(flat, ROW, ROW_FLAT)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {LISTING_ROW.singleName}: <PendingInput className="inline-flex h-6 w-40" />
        </span>
      </div>
      <div className={ROW_FIELDS}>
        <Field label={LISTING_ROW.price.label}>
          <PendingNumber placeholder={LISTING_ROW.price.placeholder} />
        </Field>
        <Field label={LISTING_ROW.unit.label} hint={LISTING_ROW.unit.hint}>
          <PendingInput type="number" />
        </Field>
        <Field label={LISTING_ROW.code.label} hint={LISTING_ROW.code.hint} className="col-span-2">
          <PendingInput placeholder={LISTING_ROW.code.placeholder} />
        </Field>
      </div>
    </div>
  );
}
