import { store } from "~/store-effect";

export function loader() {
  console.log("load...");
  const info = store.info.get();
  return info;
}
