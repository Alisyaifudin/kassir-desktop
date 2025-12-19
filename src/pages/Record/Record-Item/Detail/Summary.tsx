import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { Extra } from "./Extra";
import { memo } from "react";
import { Data } from "../loader";
import { css } from "./style.css";
import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";

export const Summary = memo(function ({
  extras,
  record,
  productLength,
}: {
  productLength: number;
  extras: Data["extras"];
  record: Data["record"];
}) {
  const size = useSize();
  return (
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
        <div className={cn("grid", css.footer[size])}>
          <p className="text-end">Pembulatan:</p>
          <p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
        </div>
      </Show>
      <div className={cn("grid", css.footer[size])}>
        <p className="text-end">Total:</p>
        <p className="text-end">Rp{record.grandTotal.toLocaleString("id-ID")}</p>
      </div>
      <Show when={!record.isCredit}>
        <div className={cn("grid", css.footer[size])}>
          <p className="text-end">Pembayaran:</p>
          <p className="text-end">Rp{record.pay.toLocaleString("id-ID")}</p>
        </div>
        <Show when={record.change > 0}>
          <div className={cn("grid", css.footer[size])}>
            <p className="text-end">Kembalian:</p>{" "}
            <p className="text-end">Rp{record.change.toLocaleString("id-ID")}</p>
          </div>
        </Show>
      </Show>
    </div>
  );
});

// const Top = memo(function ({
//   discVal,
//   totalFromItems,
//   totalAfterDiscount,
//   totalDiscount,
// }: {
//   discVal: number;
//   totalFromItems: number;
//   totalDiscount: number;
//   totalAfterDiscount: number;
// }) {
//   return (
//     <Show when={discVal > 0}>
//       <div className="grid grid-cols-[200px_250px]">
//         <p className="text-end">Subtotal:</p>
//         <p className="text-end">Rp{totalFromItems.toLocaleString("id-ID")}</p>
//       </div>
//       <div className="grid grid-cols-[200px_250px]">
//         <p className="text-end">Diskon:</p>
//         <p className="text-end">Rp{totalDiscount.toLocaleString("id-ID")}</p>
//       </div>
//       <hr />
//       <div className="grid grid-cols-[200px_250px]">
//         <div></div> <p className="text-end">Rp{totalAfterDiscount.toLocaleString("de-DE")}</p>
//       </div>
//     </Show>
//   );
// });

// const Bottom = memo(function ({
//   rounding,
//   grandTotal,
//   totalAfterAdditional,
//   pay,
//   change,
// }: {
//   rounding: number;
//   grandTotal: number;
//   totalAfterAdditional: number;
//   pay: number;
//   change: number;
// }) {
//   return (
//     <>
//       <Show when={rounding !== 0}>
//         <p className="text-end">Rp{totalAfterAdditional.toLocaleString("de-DE")}</p>
//         <div className="grid grid-cols-[200px_250px]">
//           <p className="text-end">Pembulatan:</p>
//           <p className="text-end">Rp{rounding.toLocaleString("id-ID")}</p>
//         </div>
//       </Show>
//       <div className="grid grid-cols-[200px_250px]">
//         <p className="text-end">Total:</p>
//         <p className="text-end">Rp{grandTotal.toLocaleString("id-ID")}</p>
//       </div>
//       <div className="grid grid-cols-[200px_250px]">
//         <p className="text-end">Pembayaran:</p>
//         <p className="text-end">Rp{pay.toLocaleString("id-ID")}</p>
//       </div>
//       <div className="grid grid-cols-[200px_250px]">
//         <p className="text-end">Kembalian:</p>{" "}
//         <p className="text-end">Rp{change.toLocaleString("id-ID")}</p>
//       </div>
//     </>
//   );
// });
