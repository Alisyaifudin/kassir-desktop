import { data } from "react-router";
import { db } from "~/database";
import { store } from "~/store";

export async function loader() {
  const methods = Promise.all([db.method.getAll(), store.method.get()]);
  return data(methods);
}

export type Loader = typeof loader;
