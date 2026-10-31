import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import type { RecordFull } from "~/services/record";
import { rupiah } from "~/pages/Record/z-Detail/extras";
import { Extra } from "./z-Extra";

/**
 * The money block of the printed face, in the same order as the renderer's
 * `receipt::text::build_summary_section`: subtotal, the extras, the total, the
 * rounding, then what was handed over and what came back.
 *
 * Every row goes through the one sign-leading formatter, so a rounding *down* or
 * a negative tender reads `-Rp500` here exactly as it does on paper, and each
 * amount is rounded to the record's `fix` — the stored figures carry more
 * decimals than the record prints with.
 */
export function Summary({ record }: { record: RecordFull }) {
  return (
    <div className="flex justify-end">
      <div className="flex flex-col items-end">
        <Show when={record.subTotal !== record.grandTotal && record.listings.length > 0}>
          <p className="text-end">{rupiah(record.subTotal, record.fix)}</p>
        </Show>
        <Show when={record.extras.length > 0}>
          <ForEach items={record.extras}>
            {(extra) => <Extra extra={extra} fix={record.fix} />}
          </ForEach>
          <hr className="h-2 bg-transparent border-t-2 border-dashed border-black w-full" />
          <Show when={record.total !== record.grandTotal}>
            <p className="text-end">{rupiah(record.total, record.fix)}</p>
          </Show>
        </Show>
        <Show when={record.rounding !== 0}>
          <div className="grid grid-cols-[100px_120px]">
            <p>Pembulatan</p>
            <p className="text-end">{rupiah(record.rounding, record.fix)}</p>
          </div>
        </Show>
        <div className="grid grid-cols-[100px_120px]">
          <p>Total</p>
          <p className="text-end">{rupiah(record.grandTotal, record.fix)}</p>
        </div>
        <hr className="h-2 bg-transparent border-t-2 border-dashed border-black w-full" />
        <Show when={!record.isCredit}>
          <div className="grid grid-cols-[100px_120px]">
            <p>Pembayaran</p>
            <p className="text-end">{rupiah(record.pay, record.fix)}</p>
          </div>
          <Show when={record.change !== 0}>
            <div className="grid grid-cols-[100px_120px]">
              <p>Kembalian</p>
              <p className="text-end">{rupiah(record.change, record.fix)}</p>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
