import { data } from "react-router";
import { store } from "~/store";

export async function loader() {
  const info = store.info.get();
  return data(info);
}

export type Loader = typeof loader;
