import { extrasStore, useTotal } from "../../store/extra";
import { useFix } from "../../use-transaction";
import { useStatus } from "../../use-status";
import { useSelector } from "@xstate/store/react";
import { productsStore } from "../../store/product";

export function useChange(pay: number, rounding: number) {
  const total = useTotal();
  const fix = useFix();
  const grandTotal = total.plus(rounding);
  const change = Number(grandTotal.minus(pay).times(-1).toFixed(fix));
  const loading = useStatus() === "active";
  const productsLength = useSelector(productsStore, (state) => state.context.length);
  const extrasLength = useSelector(extrasStore, (state) => state.context.length);
  const disable = loading || (productsLength === 0 && extrasLength === 0);
  return { change, disable };
}

// function program({
//   record,
//   products,
//   extras,
// }: {
//   record: {
//     isCredit: boolean;
//     cashier: string;
//     mode: DB.Mode;
//     pay: number;
//     rounding: number;
//     note: string;
//     methodId: number;
//     fix: number;
//     customer: {
//       name: string;
//       phone: string;
//     };
//     subtotal: number;
//     total: number;
//   };
//   extras: {
//     name: string;
//     value: number;
//     eff: number;
//     kind: DB.ValueKind;
//     saved: boolean;
//   }[];
//   products: {
//     id: number;
//     mode: DB.Mode;
//     fix: number;
//     timestamp: number;
//     productId?: number;
//     name: string;
//     price: number;
//     qty: number;
//     stock: number;
//     capital: number;
//     barcode: string;
//     total: number;
//     discounts: {
//       value: number;
//       eff: number;
//       kind: DB.DiscKind;
//     }[];
//   }[];
// }) {

// }

// //   const [tab] = useTab();
// //   const fix = useFix();
// //   const mode = useMode();
// //   const rounding = useRounding();
// //   const products = useAtom(productsStore, (state) => state.context);
// //   const productsLength = products.length;
// //   const extrasLength = useAtom(extrasStore, (state) => state.context.length);
// //   const status = useStatus();
// //   const dbProducts = useDBProducts();
// //   const loading = status === "active";
// //   const cashier = auth.user().name;
// //   const total = useTotal();
// //   const pay = Number(form.pay);
// //   const grandTotal = total.plus(rounding);
// //   const change = -1 * Number(grandTotal.minus(pay).toFixed(fix));
// //   const {} = useSubmit();
// // async function handleSubmit(isCredit: boolean) {
// //   if (tab === undefined) return;
// //   if (loading) return;
// //   if (productsLength === 0 && extrasLength === 0) return;
// //   const pay = Number(form.pay);
// //   const rounding = Number(form.rounding);
// //   if (isNaN(pay) || isNaN(rounding)) {
// //     return;
// //   }
// //   const [errs, formdata] = submitHandler({
// //     pay,
// //     rounding,
// //     isCredit,
// //     products,
// //     tab,
// //     all: dbProducts,
// //     cashier,
// //   });
// //   if (errs !== null) {
// //     productsStore.trigger.updateErrors({ errors: errs });
// //     return;
// //   }
// //   submit(formdata, { method: "post" });
// // }

// // type Input = {
// //   isCredit: boolean;
// //   pay: number;
// //   tab: number;
// //   rounding: number;
// //   products: Product[];
// //   all: ProductDB[];
// //   cashier: string;
// // };

// // function submitHandler({
// //   isCredit,
// //   pay,
// //   tab,
// //   rounding,
// //   products,
// //   all,
// //   cashier,
// // }: Input) {
// //   const errors: { id: string; message: string }[] = [];
// //   for (const p of products) {
// //     const dupStock = all.findIndex(
// //       (a) => a.barcode === p.barcode.trim() && p.product === undefined && p.barcode.trim() !== "",
// //     );
// //     if (dupStock !== -1) {
// //       errors.push({ id: p.id, message: `Barang dengan kode ini sudah ada di stok` });
// //       continue;
// //     }
// //     if (p.barcode.trim() === "") continue;
// //     const rest = products.filter((pi) => pi.id !== p.id);
// //     const dup = rest.find((r) => r.barcode === p.barcode);
// //     if (dup !== undefined) {
// //       errors.push({ id: p.id, message: `Duplikat kode dengan ${dup.name}` });
// //     }
// //   }
// //   if (errors.length > 0) {
// //     return err(errors);
// //   }
// //   const formdata = new FormData();
// //   formdata.set("pay", pay.toString());
// //   formdata.set("rounding", rounding.toString());
// //   formdata.set("tab", tab.toString());
// //   formdata.set("is-credit", isCredit.toString());
// //   formdata.set("cashier", cashier);
// //   formdata.set("action", "submit");
// //   return ok(formdata);
// // }
