import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { Extra } from "./Extra";
import type { RecordExtra } from "~/database-effect/record-extra/get-by-range";
import type { Record } from "../use-records";
import { METHOD_NAMES } from "~/lib/constants";

export function Footer({ record, extras }: { record: Record; extras: RecordExtra[] }) {
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
      <p className="self-start">
        Metode: {METHOD_NAMES[record.method.kind]}
        {record.method.name === undefined ? "" : " " + record.method.name}
      </p>
    </div>
  );
}
