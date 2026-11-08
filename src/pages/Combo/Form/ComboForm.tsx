import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Effect } from "effect";
import Decimal from "decimal.js";
import { ImagePlus, PackageOpen, Settings2, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { rupiah } from "~/components/cart/util-rupiah";
import { useImageUrl } from "~/hooks/use-image";
import { image } from "~/lib/image";
import { generateId } from "~/lib/random";
import { lineGrandTotal, purchaseTotal, recalcExtras } from "~/lib/purchase";
import { service } from "~/services";
import type { Combo, ComboCover, ComboInput } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";
import { ExtraStage } from "./z-ExtraStage";
import { ListingStage } from "./z-ListingStage";
import { deriveComboDiscounts, type ComboComponentDraft, type ComboDiscountDraft } from "./types";

const MAX_COVER_SIZE = 10 * 1e6;

type Stage = "listing" | "extra";

function coverMime(type: string): ComboCover["mime"] | null {
  return type === "image/png" || type === "image/jpeg" || type === "image/webp" ? type : null;
}

/** The discount editor always needs one blank trailing row to add a rule. */
function withBlankDiscount(discounts: ComboDiscountDraft[]): ComboDiscountDraft[] {
  const rows = discounts.filter((discount) => discount.value !== 0);
  if (discounts.length > 0 && discounts.at(-1)?.value === 0 && rows.length === discounts.length - 1) {
    return discounts;
  }
  return [...rows, { id: generateId(), value: 0, kind: "percent" }];
}

export function ComboForm({
  combo,
  listings,
  extras,
  onCreated,
  onDeleted,
}: {
  combo?: Combo;
  listings: Listing[];
  extras: Extra[];
  onCreated: (id: string) => void;
  onDeleted?: () => void;
}) {
  const editingId = combo?.id ?? null;
  const [name, setName] = useState(combo?.name ?? "");
  const [active, setActive] = useState(combo?.active ?? true);
  const [components, setComponents] = useState<ComboComponentDraft[]>(
    () => combo?.components.map(({ listingId, quantity, discounts }) => ({
      listingId,
      quantity,
      discounts: withBlankDiscount(discounts.map(({ id, value, kind }) => ({ id, value, kind }))),
    })) ?? [],
  );
  const [extraIds, setExtraIds] = useState<string[]>(() => combo?.extras.map(({ extraId }) => extraId) ?? []);
  const [savedCover, setSavedCover] = useState<ComboCover | null>(combo?.cover ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [clearCover, setClearCover] = useState(false);
  const [stage, setStage] = useState<Stage>("listing");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const listingById = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings]);
  const extraById = useMemo(() => new Map(extras.map((extra) => [extra.id, extra])), [extras]);
  const savedCoverUrl = useImageUrl(savedCover?.name ?? null, savedCover?.mime ?? null);
  const [draftCoverUrl, setDraftCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (coverFile === null) {
      setDraftCoverUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setDraftCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const subtotal = useMemo(
    () => components.reduce((total, component) => {
      const listing = listingById.get(component.listingId);
      if (listing === undefined) return total;
      const discounts = deriveComboDiscounts(listing.price, component.quantity, component.discounts);
      return total.plus(
        lineGrandTotal({ price: listing.price, qty: component.quantity, discounts }),
      );
    }, new Decimal(0)),
    [components, listingById],
  );
  const selectedExtras = useMemo(
    () => extraIds.flatMap((id) => {
      const extra = extraById.get(id);
      return extra === undefined ? [] : [extra];
    }),
    [extraIds, extraById],
  );
  const missingListing = components.some((component) => !listingById.has(component.listingId));
  const missingExtra = extraIds.some((id) => !extraById.has(id));
  const invalidQuantity = components.some((component) => !Number.isInteger(component.quantity) || component.quantity < 1);
  const extraEffects = useMemo(() => {
    if (missingListing || missingExtra) return new Map<string, Decimal>();
    const effects = recalcExtras(selectedExtras, subtotal);
    return new Map(selectedExtras.flatMap((extra, index) => {
      const effect = effects[index];
      return effect === undefined ? [] : [[extra.id, effect.eff] as const];
    }));
  }, [selectedExtras, subtotal, missingListing, missingExtra]);
  const grand = missingListing || missingExtra ? null : purchaseTotal(selectedExtras, subtotal);
  const coverUrl = draftCoverUrl ?? (clearCover ? null : savedCoverUrl);

  function addListing(listingId: string) {
    if (components.some((component) => component.listingId === listingId)) return;
    setError("");
    setComponents((current) => [
      ...current,
      { listingId, quantity: 1, discounts: withBlankDiscount([]) },
    ]);
  }

  function changeDiscounts(listingId: string, discounts: ComboDiscountDraft[]) {
    setError("");
    setComponents((current) => current.map((component) =>
      component.listingId === listingId ? { ...component, discounts } : component,
    ));
  }

  function changeQuantity(listingId: string, quantity: number) {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
    setError("");
    setComponents((current) => current.map((component) => {
      if (component.listingId !== listingId) return component;
      const discounts = component.discounts.map((discount) =>
        discount.kind === "pcs"
          ? { ...discount, value: Math.min(discount.value, safeQuantity) }
          : discount,
      );
      return { ...component, quantity: safeQuantity, discounts };
    }));
  }

  function commitQuantity(listingId: string, quantity: number) {
    changeQuantity(listingId, Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1);
  }

  function reorderListings(from: number, to: number) {
    setComponents((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) return current;
      next.splice(to, 0, moved);
      return next;
    });
  }

  function removeListing(listingId: string) {
    setError("");
    setComponents((current) => current.filter((component) => component.listingId !== listingId));
  }

  function addExtra(extraId: string) {
    if (extraIds.includes(extraId)) return;
    setError("");
    setExtraIds((current) => [...current, extraId]);
  }

  function removeExtra(extraId: string) {
    setError("");
    setExtraIds((current) => current.filter((id) => id !== extraId));
  }

  function reorderExtras(from: number, to: number) {
    setError("");
    setExtraIds((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) return current;
      next.splice(to, 0, moved);
      return next;
    });
  }

  function chooseCover(file: File | undefined) {
    if (file === undefined) return;
    if (file.size > MAX_COVER_SIZE) {
      setError("Ukuran gambar maksimum 10 MB.");
      return;
    }
    if (coverMime(file.type) === null) {
      setError("Format gambar harus PNG, JPEG, atau WebP.");
      return;
    }
    setError("");
    setCoverFile(file);
    setClearCover(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || components.length === 0 || missingListing || missingExtra || invalidQuantity) return;
    setSaving(true);
    setError("");
    let uploadedName: string | null = null;
    try {
      let cover = clearCover ? null : savedCover;
      if (coverFile !== null) {
        const mime = coverMime(coverFile.type);
        if (mime === null) throw new Error("Format gambar harus PNG, JPEG, atau WebP.");
        const fileName = `${generateId()}-${coverFile.name.replace(/\s+/g, "-")}`;
        await Effect.runPromise(image.save(coverFile, fileName));
        uploadedName = fileName;
        cover = { name: fileName, mime };
      }
      const input: ComboInput = {
        name: name.trim(),
        active,
        cover,
        components: components.map(({ listingId, quantity, discounts }) => ({
          listingId,
          quantity,
          discounts: discounts.map(({ value, kind }) => ({ value, kind })),
        })),
        extraIds,
      };
      if (editingId === null) {
        const id = await Effect.runPromise(service.combo.add(input));
        uploadedName = null;
        onCreated(id);
        return;
      }
      await Effect.runPromise(service.combo.set.info(editingId, input));
      uploadedName = null;
      setSavedCover(cover);
      setCoverFile(null);
      setClearCover(false);
      setError("");
    } catch (cause) {
      if (uploadedName !== null) {
        await Effect.runPromise(image.del(uploadedName)).catch(() => undefined);
      }
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan combo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCombo() {
    if (editingId === null || saving) return;
    setSaving(true);
    setError("");
    try {
      await Effect.runPromise(service.combo.delete.byId(editingId));
      onDeleted?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghapus combo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={(event) => void save(event)} className="flex h-full min-h-0 flex-col overflow-hidden" aria-busy={saving}>
        <fieldset disabled={saving} className="contents">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
              Nama kombo
              <Input value={name} onChange={(event) => setName(event.currentTarget.value)} required />
            </label>
            <div className="flex shrink-0 items-center gap-2 self-end">
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="size-4" />
                Pengaturan
              </Button>
              {editingId !== null ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" />
                  Hapus
                </Button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {stage === "listing" ? (
              <ListingStage
                listings={listings}
                components={components}
                onAdd={addListing}
                onQuantityChange={changeQuantity}
                onQuantityCommit={commitQuantity}
                onDiscountsChange={changeDiscounts}
                onRemove={removeListing}
                onReorder={reorderListings}
                onNext={() => setStage("extra")}
                extraCount={extraIds.length}
              />
            ) : (
              <ExtraStage
                extras={extras}
                extraIds={extraIds}
                effects={extraEffects}
                onAdd={addExtra}
                onRemove={removeExtra}
                onReorder={reorderExtras}
                onPrevious={() => setStage("listing")}
                listingCount={components.length}
              />
            )}
          </div>
        </fieldset>

        <footer className="shrink-0 border-t bg-background">
          {error !== "" ? (
            <div role="alert" className="px-4 pt-2">
              <TextError>{error}</TextError>
            </div>
          ) : null}
          <div className="flex min-h-[76px] items-stretch">
            <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-2">
              <span className="truncate text-5xl font-bold leading-none tabular-nums sm:text-6xl">
                {grand === null ? "—" : rupiah(grand)}
              </span>
            </div>
            <Button
              type="submit"
              disabled={saving || components.length === 0 || missingListing || missingExtra || invalidQuantity}
              className="h-auto min-w-28 rounded-none px-6 text-base sm:min-w-40 sm:px-10 sm:text-2xl"
              title={components.length === 0 ? "Tambahkan minimal satu listing untuk menyimpan." : undefined}
            >
              Simpan
              <Spinner when={saving} />
            </Button>
          </div>
        </footer>
      </form>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Pengaturan combo</DialogTitle>
            <DialogDescription>Atur ketersediaan combo di pencarian Toko dan foto sampulnya.</DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} disabled={saving} />
            Tersedia di pencarian Toko
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-base font-semibold">Foto combo</legend>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                {coverUrl === null ? (
                  <PackageOpen className="size-8 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <img src={coverUrl} alt="Pratinjau foto combo" className="size-full object-cover" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent">
                  <ImagePlus className="size-4" />
                  Pilih foto
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => {
                      chooseCover(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {savedCover !== null || coverFile !== null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => { setCoverFile(null); setClearCover(true); }}
                  >
                    Hapus foto
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">PNG, JPEG, atau WebP; maksimum 10 MB.</p>
          </fieldset>
          {error !== "" ? (
            <div role="alert">
              <TextError>{error}</TextError>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" onClick={() => setSettingsOpen(false)} disabled={saving}>Selesai</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Hapus combo</DialogTitle>
            <DialogDescription>
              Hapus {combo?.name ?? "combo ini"} dari pencarian Toko? Riwayat transaksi yang sudah dibuat tidak berubah.
            </DialogDescription>
          </DialogHeader>
          <TextError>{error}</TextError>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>Batal</Button>
            <Button type="button" variant="destructive" onClick={() => void deleteCombo()} disabled={saving}>
              Hapus
              <Spinner when={saving} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
