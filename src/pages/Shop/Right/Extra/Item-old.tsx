// import { Extra, extrasStore } from "./use-extras";
// import { useStoreValue } from "@simplestack/store/react";
// import { useEffect, useState } from "react";
// import { cn } from "~/lib/utils";
// import { css } from "../style.css";
// import { basicStore } from "~/pages/Shop/use-transaction";
// import { queue } from "~/pages/Shop/utils/queue";
// import { Show } from "~/components/Show";
// import { Delete } from "./Delete";
// import { Loading } from "~/components/Loading";
// import { useSubtotal } from "../use-subtotal";
// import Decimal from "decimal.js";
// import { tx } from "~/transaction";
// import { useSize } from "~/hooks/use-size";
// import { Store } from "@simplestack/store";
// import { produce } from "immer";

// function useStore(index: number) {
//   const value = useStoreValue(extrasStore)[index];
//   const setValue = extrasStore.set;
//   return [value, setValue] as const;
// }

// function useEffVal(index: number, prevTotal?: Decimal) {
//   const [store, setStore] = useStore(index);
//   const { value, kind } = store;
//   const [effVal, setEffVal] = useState<number | undefined>(undefined);
//   const fix = useStoreValue(basicStore.select("fix"));
//   useEffect(() => {
//     const effVal =
//       kind === "number"
//         ? value
//         : prevTotal === undefined
//           ? undefined
//           : new Decimal(prevTotal).times(value).div(100).toNumber();
//     setEffVal(effVal);
//     if (prevTotal === undefined || effVal === undefined) return;
//     const subtotal = prevTotal.plus(effVal);
//     setStore(
//       produce((draft) => {
//         draft[index].subtotal = subtotal;
//       }),
//     );
//   }, [prevTotal, effVal, value]);
//   return effVal === undefined ? undefined : Number(effVal.toFixed(fix));
// }

// export function ItemFirst({ index }: { index: number }) {
//   const prevTotal = useSubtotal();
//   const effVal = useEffVal(index, prevTotal);
//   return <Item effVal={effVal} index={index} />;
// }

// export function ItemRest({ id, prevId }: { id: string; prevId: string }) {
//   const store = extraStore(id);
//   const prevStore = extraStore(prevId);
//   if (store === undefined || prevStore === undefined) return null;
//   return <ItemRestWrapper store={store} prevStore={prevStore} />;
// }

// function ItemRestWrapper({ store, prevStore }: { store: Store<Extra>; prevStore: Store<Extra> }) {
//   const prevTotal = useStoreValue(prevStore.select("subtotal"));
//   const effVal = useEffVal(store, prevTotal);
//   return <Item effVal={effVal} store={store} />;
// }
// export function Item({ index, effVal }: { index: number; effVal?: number }) {
//   const [store, setStore] = useStore(index);
//   const { kind, id, saved, name, value } = store;
//   const size = useSize();
//   const [input, setInput] = useState(value === 0 ? "" : value.toString());
//   const handleKind = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const val = e.currentTarget.value;
//     if (val !== "percent" && val !== "number") return;
//     if (val === "percent") {
//       if (value > 100) {
//         setStore(
//           produce((draft) => {
//             draft[index].value = 100;
//           }),
//         );
//         queue.add(() => tx.extra.update.value(id, 100));
//       } else if (value < -100) {
//         setStore(
//           produce((draft) => {
//             draft[index].value = -100;
//           }),
//         );
//         queue.add(() => tx.extra.update.value(id, -100));
//       }
//     }
//     setStore(
//       produce((draft) => {
//         draft[index].value = -100;
//       }),
//     );
//     queue.add(() => tx.extra.update.kind(id, val));
//   };
//   return (
//     <div className={cn("grid gap-1 py-0.5 self-end items-center", css.additional[size][kind])}>
//       <input
//         type="checkbox"
//         name="saved"
//         checked={saved}
//         onChange={(e) => {
//           const saved = e.currentTarget.checked;
//           store.select("saved").set(saved);
//           queue.add(() => tx.extra.update.saved(id, saved));
//         }}
//       />
//       <input
//         type="text"
//         className="pl-1 text-normal"
//         value={name}
//         onChange={(e) => {
//           const name = e.currentTarget.value;
//           store.select("name").set(name);
//           queue.add(() => tx.extra.update.name(id, name));
//         }}
//       />
//       <Show when={kind === "number"}>
//         <select value={kind} className="w-fit" onChange={handleKind}>
//           <option value="number">Angka</option>
//           <option value="percent">Persen</option>
//         </select>
//       </Show>
//       <Show when={kind === "number"}>
//         <p>Rp</p>
//       </Show>
//       <input
//         type="number"
//         className="border py-1 pl-1 text-normal"
//         value={input}
//         onChange={(e) => {
//           let val = e.currentTarget.value;
//           let num = Number(val);
//           if (isNaN(num)) return;
//           if (kind === "percent") {
//             if (num > 100) {
//               num = 100;
//               val = num.toString();
//             } else if (num < -100) {
//               num = -100;
//               val = num.toString();
//             }
//           }
//           setInput(val);
//           store.select("value").set(num);
//           queue.add(() => tx.extra.update.value(id, num));
//         }}
//       />
//       <Show when={kind === "percent"}>
//         <select value={kind} className="w-fit border" onChange={handleKind}>
//           <option value="number">Angka</option>
//           <option value="percent">Persen</option>
//         </select>
//         <Show value={effVal} fallback={<Loading />}>
//           {(effVal) => <p className="text-end">Rp{Number(effVal).toLocaleString("id-ID")}</p>}
//         </Show>
//       </Show>
//       <Delete id={id} />
//     </div>
//   );
// }
