import { data } from "react-router";
import { db } from "~/database";

export async function loader() {
  const socials = db.social.getAll();
  return data(socials);
}

export type Loader = typeof loader;
