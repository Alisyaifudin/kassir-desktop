import { db } from "~/database-effect";

export function loader() {
  const socials = db.social.getAll();
  return socials;
}

export const KEY = "socials"