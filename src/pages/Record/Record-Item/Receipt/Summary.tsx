import { Extra } from "./Extra";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { Data } from "../loader";

export function SummaryBody({
  record,
  extras,
  productLength,
}: {
  productLength: number;
  record: Data["record"];
  extras: Data["extras"];
}) {
  return (
    <div className="flex justify-end">
      <div className="flex flex-col items-end">
        <Show when={record.subTotal !== record.grandTotal && productLength > 0}>
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
          <div className={"grid grid-cols-[100px_120px]"}>
            <p className="text-end">Pembulatan:</p>
            <p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
          </div>
        </Show>
        <div className="grid grid-cols-[100px_120px]">
          <p>Total</p>
          <p className="text-end">Rp{record.grandTotal.toLocaleString("id-ID")}</p>
        </div>
        <div className="grid grid-cols-[100px_120px]">
          <p>Pembayaran</p>
          <p className="text-end">Rp{record.pay.toLocaleString("id-ID")}</p>
        </div>
        <Show when={record.change !== 0}>
          <hr className="w-full" />
          <div className="grid grid-cols-[100px_120px]">
            <p>Kembalian</p> <p className="text-end">Rp{record.change.toLocaleString("id-ID")}</p>
          </div>
        </Show>
      </div>
    </div>
  );
}
