import { Show } from "~/components/Show";
import { METHOD_NAMES } from "~/lib/constants";
import type { RecordFull } from "~/services/record";
import { rupiah } from "./extras";

/**
 * The settlement — everything after the line items. Extras are their own table
 * now, and it carries both the subtotal and the running total, so this only
 * repeats the subtotal for records with no extras to show it in (720 records
 * round without carrying any extras, and losing the pre-rounding figure there
 * would be a real omission).
 */
export function Footer({ record }: { record: RecordFull }) {
  // A record can carry several payments (split payment); list them all.
  const methods = record.methods
    .map((method) => `${METHOD_NAMES[method.kind]}${method.name ? ` ${method.name}` : ""}`)
    .join(", ");

  return (
    <div className="flex flex-col items-end">
      <Show
        when={
          record.extras.length === 0 &&
          record.subTotal !== record.grandTotal &&
          record.subTotal !== 0
        }
      >
        <p className="text-end">{rupiah(record.subTotal, record.fix)}</p>
      </Show>
      <Show when={record.rounding !== 0}>
        <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
          <p className="text-end">Pembulatan:</p>
          <p className="text-end tabular-nums">{rupiah(record.rounding, record.fix)}</p>
        </div>
      </Show>
      <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
        <p className="text-end">Total:</p>
        <p className="text-end tabular-nums">{rupiah(record.grandTotal, record.fix)}</p>
      </div>
      <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
        <p className="text-end">Pembayaran:</p>
        <p className="text-end tabular-nums">{rupiah(record.pay, record.fix)}</p>
      </div>
      <Show when={record.change !== 0}>
        <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
          <p className="text-end">Kembalian:</p>{" "}
          <p className="text-end tabular-nums">{rupiah(record.change, record.fix)}</p>
        </div>
      </Show>
      {methods === "" ? null : <p className="self-start">Metode: {methods}</p>}
    </div>
  );
}
