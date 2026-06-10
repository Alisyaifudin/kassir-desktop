import { sqlx } from "~/database/sqlx";

export function getAllUnsyncSocials() {
  return sqlx.social.get.unsync();
}

export function getAllUnsync() {
  return sqlx.social.get.allUnsync();
}
