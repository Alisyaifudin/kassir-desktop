import { Store } from "@tauri-apps/plugin-store";

export const store = {
  owner: (s: Store) => s.get<string>("owner")
}