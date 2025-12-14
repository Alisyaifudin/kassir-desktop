import { Store } from "@tauri-apps/plugin-store";

let store: undefined | Store = undefined;

const STORE_PATH = "store.json";

export async function getStore() {
  if (store !== undefined) return store;
  store = await Store.load(STORE_PATH);
  return store;
}
