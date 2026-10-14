import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { METHOD_NAMES } from "~/lib/constants";
import type { RecordExtra, Record } from "~/services/record";
import { Extra } from "./Extra";

export function Footer({ record, extras }: { record: Record; extras: RecordExtra[] }) {
  // A record can carry several payments (split payment); list them all.
  const methods = record.methods
    .map((method) => `${METHOD_NAMES[method.kind]}${method.name ? ` ${method.name}` : ""}`)
    .join(", ");

  return (
    <div className="flex flex-col items-end">
      <Show when={record.subTotal !== record.grandTotal && record.subTotal !== 0}>
        <p className="text-end">Rp{record.subTotal.toLocaleString("id-ID")}</p>
      </Show>
      <Show when={extras.length > 0}>
        <ForEach items={extras}>{(extra) => <Extra extra={extra} />}</ForEach>
        <hr className="w-full" />
        <Show when={record.total !== record.grandTotal}>
          <p className="text-end">Rp{record.total.toLocaleString("id-ID")}</p>
        </Show>
      </Show>
      <Show when={record.rounding !== 0}>
        <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
          <p className="text-end">Pembulatan:</p>
          <p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
        </div>
      </Show>
      <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
        <p className="text-end">Total:</p>
        <p className="text-end">Rp{record.grandTotal.toLocaleString("id-ID")}</p>
      </div>
      <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
        <p className="text-end">Pembayaran:</p>
        <p className="text-end">Rp{record.pay.toLocaleString("id-ID")}</p>
      </div>
      <Show when={record.change !== 0}>
        <div className="grid grid-cols-[1fr_220px] small:grid-cols-[1fr_170px]">
          <p className="text-end">Kembalian:</p>{" "}
          <p className="text-end">Rp{record.change.toLocaleString("id-ID")}</p>
        </div>
      </Show>
      {methods === "" ? null : <p className="self-start">Metode: {methods}</p>}
    </div>
  );
}
