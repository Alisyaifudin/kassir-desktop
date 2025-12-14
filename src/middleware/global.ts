// import { createContext, MiddlewareFunction, RouterContextProvider } from "react-router";
// import { Database } from "~/database";
// import { Store } from "~/lib/store-old";
// import DatabaseTauri from "@tauri-apps/plugin-sql";
// import { Store as StoreTauri } from "@tauri-apps/plugin-store";
// import { generateDB } from "../database";
// import { generateStore } from "../lib/store-old";
// import { generateTX, Transaction } from "~/transaction";

// const STORE_PATH = "store.json";
// const DB_PATH = "sqlite:data.db";
// export const TX_PATH = "sqlite:tx.db";

// export const globalContext = createContext<{
//   db: Database;
//   tx: Transaction;
//   store: Store;
// } | null>(null);

// const dataPromise = Promise.all([
//   StoreTauri.load(STORE_PATH, { autoSave: false }),
//   DatabaseTauri.load(DB_PATH),
//   DatabaseTauri.load(TX_PATH),
// ]);

// export const globalMid: MiddlewareFunction = async ({ context }, next) => {
//   const top = context.get(globalContext);
//   if (top !== null) {
//     return next();
//   }
//   const data = await dataPromise;
//   const store = generateStore(data[0]);
//   const db = generateDB(data[1]);
//   const tx = generateTX(data[2]);
//   context.set(globalContext, { store, db, tx });
//   await next();
// };

// export function getContext(context: Readonly<RouterContextProvider>): {
//   db: Database;
//   store: Store;
//   tx: Transaction;
// } {
//   const top = context.get(globalContext);
//   if (top === null) {
//     throw new Error("top level context is null?????");
//   }
//   return top;
// }
