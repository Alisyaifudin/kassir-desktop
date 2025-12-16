import { data } from "react-router";
import { db } from "~/database";

export async function loader() {
  const methods = db.method.getAll();
  return data(methods);
}

export type Loader = typeof loader;
