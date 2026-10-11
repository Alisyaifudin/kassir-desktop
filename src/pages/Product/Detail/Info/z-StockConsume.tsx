import { useState } from "react";
import { Effect } from "effect";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NumberField } from "~/components/NumberField";
import { service } from "~/services";
import type { ProductFull } from "~/services/product";
import { parseNumber } from "../../Form/types";
import { Field } from "../../Form/z-Field";
import { Section } from "../../Form/z-Section";

export function StockConsume({ product }: { product: ProductFull }) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConsume() {
    const pcs = Math.round(parseNumber(value));
    if (pcs <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    if (pcs > product.stock) {
      setError("Stok tidak mencukupi.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await Effect.runPromise(
      service.product.stock
        .consume(product.id, { value: pcs, note: note.trim() })
        .pipe(Effect.either),
    );
    setBusy(false);
    if (result._tag === "Left") {
      setError(result.left.message);
      return;
    }
    setValue("");
    setNote("");
  }

  return (
    <Section
      title="Kurangi stok"
      description="Catat stok keluar tanpa transaksi (rusak, hilang, koreksi). Langsung tersimpan, tidak menunggu Simpan."
      error={error ?? undefined}
      className="border-dashed"
    >
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Jumlah (pcs)" className="w-40">
          <NumberField value={value} disabled={busy} onValueChange={setValue} placeholder="0" />
        </Field>
        <Field label="Catatan" className="min-w-[160px] flex-1">
          <Input
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="cth. rusak"
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          className="h-[54px] text-small small:h-10"
          disabled={busy}
          onClick={() => void handleConsume()}
        >
          Kurangi
          <Spinner when={busy} />
        </Button>
      </div>
      <p className="text-small text-muted-foreground">
        Stok tersedia: {product.stock.toLocaleString("id-ID")} pcs
      </p>
    </Section>
  );
}
