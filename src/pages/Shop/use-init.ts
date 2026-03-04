// import { useEffect, useState } from "react";
// import { tabsStore, useTab } from "./use-tab";
// import { loadingStore } from "./Right/use-total";
// import { basicStore } from "./use-transaction";
// import { tx } from "~/transaction-effect";
// import { Effect, Either } from "effect";
// import { log } from "~/lib/utils";
// import { TabInfo } from "~/transaction-effect/transaction/get-all";

// export function useInitTransaction(transaction) {
//   useEffect(() => {
//     async function init(tab?: number) {
//       const tabs = tabsStore.get();
//       loadingStore.trigger.setTransaction({ value: true });
//       const either = await Effect.runPromise(Effect.either(program(tabs, tab)));
//       loadingStore.trigger.setTransaction({ value: false });
//       Either.match(either, {
//         onLeft(e) {
//           switch (e.kind) {
//             case "error":
//               setError(e.msg);
//               break;
//             case "redirect":
//               setTab(e.tab);
//               break;
//           }
//         },
//         onRight(res) {
//           setError(null);
//           basicStore.set({
//             rounding: 0,
//             fix: res.fix,
//             methodId: res.methodId,
//             mode: res.mode,
//             note: res.note,
//             query: res.query,
//           });
//         },
//       });
//     }
//     init(tab);
//   }, [tab]);
//   return error;
// }

// function program(tabs: TabInfo[], rawTab?: number) {
//   return Effect.gen(function* () {
//     const tab = yield* guard(tabs, rawTab);
//     return yield* tx.transaction.get.byTab(tab);
//   }).pipe(
//     Effect.catchTags({
//       NotFound: (e) => {
//         log.error(e.msg);
//         return Effect.fail({ kind: "error" as const, msg: e.msg });
//       },
//       TooMany: (e) => {
//         log.error(e.msg);
//         return Effect.fail({ kind: "error" as const, msg: e.msg });
//       },
//       TxError: ({ e }) => {
//         log.error(JSON.stringify(e.stack));
//         return Effect.fail({ kind: "error" as const, msg: e.message });
//       },
//       TabError: (e) => {
//         return Effect.fail({ kind: "redirect" as const, tab: e.tab });
//       },
//     }),
//   );
// }

// class TabError {
//   readonly _tag = "TabError";
//   constructor(readonly tab: number) {}
//   static fail(tab: number) {
//     return Effect.fail(new TabError(tab));
//   }
// }

// function guard(tabs: TabInfo[], tab?: number) {
//   return Effect.gen(function* () {
//     if (tabs.length === 0) {
//       const insertedTab = yield* tx.transaction.add.new();
//       return yield* TabError.fail(insertedTab);
//     }
//     if (tab === undefined || tabs.find((t) => t.tab === tab) === undefined) {
//       return yield* TabError.fail(tabs[tabs.length - 1].tab);
//     }
//     return tab;
//   });
// }
