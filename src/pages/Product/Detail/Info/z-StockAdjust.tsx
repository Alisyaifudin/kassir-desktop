import { useState } from "react";
import { Effect } from "effect";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NumberField } from "~/components/NumberField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { service } from "~/services";
import type { ProductFull, Stock } from "~/services/product";
import { cn } from "~/lib/utils";
import { parseNumber } from "../../Form/types";
import { Field } from "../../Form/z-Field";

/**
 * Manual stock correction for a single lot: a signed amount (positive adds,
 * negative subtracts). Applies immediately and records a history event — it does
 * not wait for the edit form's Simpan.
 *
 * The parent mounts this only while a lot is selected, so the draft state below
 * resets on every open.
 */
export function StockAdjust({
  product,
  lot,
  onClose,
}: {
  product: ProductFull;
  lot: Stock;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = product.stocks.find((stock) => stock.id === lot.id) ?? lot;
  const hasAmount = amount.trim() !== "" && amount !== "-";
  const delta = hasAmount ? Math.round(parseNumber(amount)) : 0;
  const next = current.value + delta;

  const problem = !hasAmount
    ? null
    : delta === 0
      ? "Jumlah tidak boleh 0."
      : next < 0
        ? "Stok lot tidak mencukupi."
        : null;
  const canSave = hasAmount && delta !== 0 && next >= 0 && !busy;

  function handleOpenChange(nextOpen: boolean) {
    if (busy) return;
    if (!nextOpen) onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const result = await Effect.runPromise(
      service.product.stock
        .adjust(product.id, current.id, {
          value: next,
          capital: current.capital,
          note: note.trim(),
        })
        .pipe(Effect.either),
    );
    setBusy(false);
    if (result._tag === "Left") {
      setError(result.left.message);
      return;
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-normal">Sesuaikan stok</DialogTitle>
          <DialogDescription className="text-small">
            Stok sekarang {current.value.toLocaleString("id-ID")} pcs · modal{" "}
            {current.capital.toLocaleString("id-ID")} / pcs. Isi nilai positif untuk menambah,
            negatif untuk mengurangi. Langsung tersimpan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Perubahan (pcs)" hint="cth. 12 untuk menambah, -5 untuk mengurangi">
            <NumberField
              value={amount}
              disabled={busy}
              onValueChange={setAmount}
              placeholder="0"
              autoFocus
            />
          </Field>

          <Field label="Catatan">
            <Input
              value={note}
              disabled={busy}
              onChange={(event) => setNote(event.currentTarget.value)}
              placeholder="cth. rusak"
            />
          </Field>

          <p
            className={cn("text-small", problem ? "text-destructive" : "text-muted-foreground")}
          >
            {problem ??
              (hasAmount
                ? `Stok baru: ${current.value.toLocaleString("id-ID")} → ${next.toLocaleString("id-ID")} pcs`
                : `Stok saat ini: ${current.value.toLocaleString("id-ID")} pcs`)}
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onClose()}>
              Batal
            </Button>
            <Button type="submit" disabled={!canSave}>
              Simpan
              <Spinner when={busy} />
            </Button>
          </div>

          <TextError>{error}</TextError>
        </form>
      </DialogContent>
    </Dialog>
  );
}
