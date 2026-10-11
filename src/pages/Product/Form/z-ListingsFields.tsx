import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { NumberField } from "~/components/NumberField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { LISTING_KIND_SUGGESTIONS, type ListingDraft } from "./types";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { Section } from "./z-Section";

type ListingError = { name?: string; price?: string; unit?: string } | undefined;

const CODE_KINDS: { value: ListingDraft["codeKind"]; label: string }[] = [
  { value: "barcode", label: "Barcode" },
  { value: "qr", label: "QR" },
];

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
      title="Listing"
      description="Minimal satu listing. Satu listing = satu satuan jual (mis. eceran, grosir)."
      error={errors.listings}
      action={
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1 text-small small:h-9"
          disabled={disabled}
          onClick={form.addListing}
        >
          <Plus className="icon" /> Tambah
        </Button>
      }
    >
      <datalist id="listing-kind-suggestions">
        {LISTING_KIND_SUGGESTIONS.map((kind) => (
          <option key={kind} value={kind} />
        ))}
      </datalist>
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
    <div className="flex flex-col gap-3 rounded-lg border bg-background/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-small font-medium text-muted-foreground">Listing {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          className="size-11 small:size-9"
          disabled={disabled || !canRemove}
          onClick={onRemove}
          aria-label="Hapus listing"
        >
          <Trash2 className="icon" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Nama" error={error?.name} className="col-span-2">
          <Input
            value={listing.name}
            disabled={disabled}
            onChange={(e) => onChange({ name: e.currentTarget.value })}
            placeholder="cth. Eceran"
          />
        </Field>
        <Field label="Harga" error={error?.price}>
          <NumberField
            value={listing.price}
            disabled={disabled}
            onValueChange={(price) => onChange({ price })}
            placeholder="0"
          />
        </Field>
        <Field label="Satuan (× pcs)" error={error?.unit} hint="1 = 1 pcs, 12 = 1 lusin">
          <Input
            type="number"
            min={1}
            step={1}
            value={listing.unit}
            disabled={disabled}
            onChange={(e) => onChange({ unit: e.currentTarget.value })}
          />
        </Field>
        <Field label="Jenis" className="col-span-2">
          <Input
            list="listing-kind-suggestions"
            value={listing.kind}
            disabled={disabled}
            onChange={(e) => onChange({ kind: e.currentTarget.value })}
            placeholder="retail"
          />
        </Field>
        <div className="col-span-2 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-small">
            <Checkbox
              checked={listing.hasCode}
              disabled={disabled}
              onCheckedChange={(checked) => onChange({ hasCode: checked === true })}
            />
            Punya kode
          </label>
          {listing.hasCode ? (
            <div className="flex gap-2">
              <Input
                value={listing.code}
                disabled={disabled}
                onChange={(e) => onChange({ code: e.currentTarget.value })}
                placeholder="Barcode / QR"
              />
              <Select
                value={listing.codeKind}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange({ codeKind: value as ListingDraft["codeKind"] })
                }
              >
                <SelectTrigger className="w-[140px] text-small small:w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_KINDS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
