import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type Decimal from "decimal.js";
import { Field } from "../z-Field";
import { rupiah } from "../util-rupiah";
import type { Extra } from "../mock";

/**
 * Charges and deductions on the whole purchase — ongkos kirim, a grosir
 * discount, a rounding-off favour. Each shows what it works out to, because
 * "3%" is not a number a shopkeeper can check at a glance.
 */
export function Extras({ extras }: { extras: Extra[] }) {
  if (extras.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 p-1">
      {extras.map((extra, i) => (
        <Row key={extra.id} extra={extra} no={i + 1} />
      ))}
    </div>
  );
}

function Row({ extra, no }: { extra: Extra; no: number }) {
  return (
    <div className="flex gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <span className="pt-1 text-normal text-muted-foreground select-none">{no}.</span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Input className="h-9" defaultValue={extra.name} placeholder="Nama biaya tambahan..." />
        <div className="grid grid-cols-[150px_150px_1fr_50px] items-end gap-4">
          <Field label="Tipe">
            <Input className="h-9" defaultValue={extra.kind === "percent" ? "Persen" : "Angka"} />
          </Field>
          <Field label={extra.kind === "percent" ? "Nilai (%)" : "Nilai (Rp)"}>
            <Input className="h-9 font-medium" defaultValue={extra.value} />
          </Field>
          <Field label="Efektif" className="items-end">
            <span className="text-big font-bold tabular-nums text-primary">
              {rupiah(extra.eff)}
            </span>
          </Field>
          <Button
            variant="destructive"
            size="icon"
            className="mb-0.5 rounded-full"
            title="Hapus biaya"
          >
            <X className="icon" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** What the lines come to before everything else. */
export function Subtotal({ subtotal }: { subtotal: Decimal }) {
  return (
    <div className="flex items-baseline justify-between self-end gap-2 px-2 py-1">
      <span className="text-big font-bold">Subtotal:</span>
      <span className="text-big font-bold tabular-nums">{rupiah(subtotal)}</span>
    </div>
  );
}
