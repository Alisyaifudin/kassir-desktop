import { useEffect, useMemo, useState } from "react";
import { Effect } from "effect";
import { ImagePlus, PackageOpen, Plus, Trash2, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useImageUrl } from "~/hooks/use-image";
import { image } from "~/lib/image";
import { generateId } from "~/lib/random";
import { rupiah } from "~/components/cart/util-rupiah";
import { service } from "~/services";
import type { Combo, ComboCover, ComboInput } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";
import { pageData } from "./data";

const MAX_COVER_SIZE = 10 * 1e6;

function coverMime(type: string): ComboCover["mime"] | null {
  return type === "image/png" || type === "image/jpeg" || type === "image/webp" ? type : null;
}

function extraValue(extra: Extra): string {
  return extra.kind === "percent" ? `${extra.value}%` : rupiah(extra.value);
}

export default function Page() {
  const sources = useMemo(
    () => ({
      combos: service.combo.get.changes,
      listings: service.listing.get.changes,
      extras: service.extra.get.changes,
    }),
    [],
  );

  return (
    <pageData.Provider sources={sources}>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-4">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold">Combo</h1>
            <p className="mt-1 text-base text-muted-foreground">
              Gabungkan beberapa listing dan biaya atau potongan untuk ditambahkan sekaligus di Toko.
              Biaya dan potongan combo berlaku untuk seluruh transaksi.
            </p>
          </div>
        </header>
        <pageData.Gate
          keys={["combos", "listings", "extras"]}
          pulse={<WorkspaceLoading />}
          error={(error) => <TextError>{`Combo tidak dapat dimuat: ${error.message}`}</TextError>}
        >
          {({ combos, listings, extras }) => (
            <Workspace combos={combos} listings={listings} extras={extras} />
          )}
        </pageData.Gate>
      </main>
    </pageData.Provider>
  );
}

function Workspace({
  combos,
  listings,
  extras,
}: {
  combos: Combo[];
  listings: Listing[];
  extras: Extra[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [components, setComponents] = useState<{ listingId: string; quantity: number }[]>([]);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [savedCover, setSavedCover] = useState<ComboCover | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [clearCover, setClearCover] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = combos.find((combo) => combo.id === editingId);
  const listingById = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings]);
  const extraById = useMemo(() => new Map(extras.map((extra) => [extra.id, extra])), [extras]);
  const listingOptions: ComboboxOption[] = useMemo(
    () =>
      listings.map((listing) => ({
        value: listing.id,
        label: `${listing.name} · ${listing.productName} · ${rupiah(listing.price)}`,
      })),
    [listings],
  );
  const extraOptions: ComboboxOption[] = useMemo(
    () => extras.map((extra) => ({ value: extra.id, label: `${extra.name} · ${extraValue(extra)}` })),
    [extras],
  );
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

  function reset() {
    setEditingId(null);
    setName("");
    setActive(true);
    setComponents([]);
    setExtraIds([]);
    setSavedCover(null);
    setCoverFile(null);
    setClearCover(false);
    setError("");
    setConfirmDelete(false);
  }

  function edit(combo: Combo) {
    setEditingId(combo.id);
    setName(combo.name);
    setActive(combo.active);
    setComponents(combo.components.map(({ listingId, quantity }) => ({ listingId, quantity })));
    setExtraIds(combo.extras.map((extra) => extra.extraId));
    setSavedCover(combo.cover);
    setCoverFile(null);
    setClearCover(false);
    setError("");
  }

  function addListing(listingId: string) {
    if (components.some((component) => component.listingId === listingId)) {
      setError("Listing itu sudah ada di combo.");
      return;
    }
    setError("");
    setComponents((current) => [...current, { listingId, quantity: 1 }]);
  }

  function addExtra(extraId: string) {
    if (extraIds.includes(extraId)) {
      setError("Biaya atau potongan itu sudah ada di combo.");
      return;
    }
    setError("");
    setExtraIds((current) => [...current, extraId]);
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

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    let uploadedName: string | null = null;
    try {
      let cover = clearCover ? null : savedCover;
      if (coverFile !== null) {
        const mime = coverMime(coverFile.type);
        if (mime === null) throw new Error("Format gambar harus PNG, JPEG, atau WebP.");
        const name = `${generateId()}-${coverFile.name.replace(/\s+/g, "-")}`;
        await Effect.runPromise(image.save(coverFile, name));
        uploadedName = name;
        cover = { name, mime };
      }
      const input: ComboInput = { name: name.trim(), active, cover, components, extraIds };
      if (editingId === null) {
        const id = await Effect.runPromise(service.combo.add(input));
        setEditingId(id);
      } else {
        await Effect.runPromise(service.combo.set.info(editingId, input));
      }
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
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghapus combo.");
    } finally {
      setSaving(false);
    }
  }

  const coverUrl = draftCoverUrl ?? (clearCover ? null : savedCoverUrl);

  return (
    <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(420px,1.4fr)]">
      <section className="flex min-w-0 flex-col gap-3 border-b pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Daftar combo</h2>
          <Button type="button" variant="outline" onClick={reset}>
            <Plus className="size-5" />
            Combo baru
          </Button>
        </div>
        {combos.length === 0 ? (
          <p className="py-3 text-base text-muted-foreground">
            Belum ada combo. Buat combo untuk menambahkan beberapa listing sekaligus di Toko.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {combos.map((combo) => (
              <li key={combo.id}>
                <button
                  type="button"
                  onClick={() => edit(combo)}
                  className={`flex w-full items-start justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active ${
                    editingId === combo.id ? "text-foreground" : "text-foreground/80 hover:text-foreground"
                  }`}
                  aria-current={editingId === combo.id ? "true" : undefined}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium">{combo.name}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {combo.components.length} listing · {combo.extras.length} tambahan
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {combo.active ? "Aktif" : "Nonaktif"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0 pb-8">
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{editingId === null ? "Combo baru" : "Ubah combo"}</h2>
            {editingId !== null ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                <Trash2 className="size-4" />
                Hapus
              </Button>
            ) : null}
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nama combo
            <Input value={name} onChange={(event) => setName(event.currentTarget.value)} required />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
            Tersedia di pencarian Toko
          </label>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-base font-semibold">Listing</legend>
            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada listing di combo ini.</p>
            ) : (
              <ul className="flex flex-col divide-y border-y">
                {components.map((component) => {
                  const listing = listingById.get(component.listingId);
                  return (
                    <li key={component.listingId} className="flex flex-wrap items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {listing?.name ?? "Listing tidak tersedia"}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {listing === undefined ? component.listingId : `${listing.productName} · ${rupiah(listing.price)}`}
                        </span>
                      </span>
                      <label className="flex items-center gap-2 text-sm">
                        Jumlah
                        <Input
                          aria-label={`Jumlah ${listing?.name ?? "listing"}`}
                          type="number"
                          min={1}
                          step={1}
                          className="w-24"
                          value={component.quantity}
                          onChange={(event) => {
                            const quantity = Number(event.currentTarget.value);
                            setComponents((current) =>
                              current.map((item) =>
                                item.listingId === component.listingId
                                  ? { ...item, quantity: Number.isFinite(quantity) ? quantity : 1 }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Hapus ${listing?.name ?? "listing"} dari combo`}
                        onClick={() => setComponents((current) => current.filter((item) => item.listingId !== component.listingId))}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Combobox
              value=""
              onValueChange={addListing}
              options={listingOptions.filter((option) => !components.some((item) => item.listingId === option.value))}
              placeholder="Cari listing untuk ditambahkan"
              emptyText="Listing tidak ditemukan"
              adder
              aria-label="Tambah listing ke combo"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-base font-semibold">Biaya dan potongan</legend>
            {extraIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada biaya atau potongan tambahan.</p>
            ) : (
              <ul className="flex flex-col divide-y border-y">
                {extraIds.map((extraId) => {
                  const extra = extraById.get(extraId);
                  return (
                    <li key={extraId} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {extra?.name ?? "Biaya atau potongan tidak tersedia"}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {extra === undefined ? extraId : extraValue(extra)}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Hapus ${extra?.name ?? "tambahan"} dari combo`}
                        onClick={() => setExtraIds((current) => current.filter((id) => id !== extraId))}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Combobox
              value=""
              onValueChange={addExtra}
              options={extraOptions.filter((option) => !extraIds.includes(option.value))}
              placeholder="Cari biaya atau potongan"
              emptyText="Biaya atau potongan tidak ditemukan"
              adder
              aria-label="Tambah biaya atau potongan ke combo"
            />
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-base font-semibold">Foto combo</legend>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                {coverUrl === null ? (
                  <PackageOpen className="size-8 text-muted-foreground" />
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
                    onChange={(event) => chooseCover(event.currentTarget.files?.[0])}
                  />
                </label>
                {savedCover !== null || coverFile !== null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCoverFile(null);
                      setClearCover(true);
                    }}
                  >
                    Hapus foto
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">PNG, JPEG, atau WebP; maksimum 10 MB.</p>
          </fieldset>

          <TextError>{error}</TextError>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button type="submit" disabled={saving}>
              {editingId === null ? "Simpan combo" : "Simpan perubahan"}
              <Spinner when={saving} />
            </Button>
            {editingId !== null ? (
              <Button type="button" variant="outline" onClick={reset} disabled={saving}>
                Batal
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Hapus combo</DialogTitle>
            <DialogDescription>
              Hapus {selected?.name ?? "combo ini"} dari pencarian Toko? Riwayat transaksi yang sudah
              dibuat tidak berubah.
            </DialogDescription>
          </DialogHeader>
          <TextError>{error}</TextError>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={() => void deleteCombo()} disabled={saving}>
              Hapus
              <Spinner when={saving} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <div className="grid min-h-[420px] grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(420px,1.4fr)]" aria-busy="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-40" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-none" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-md" />
      </div>
    </div>
  );
}
