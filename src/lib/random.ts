import { ulid } from "ulid";
// 10-characters long string consisting of the upper case letters
export function generateId() {
  return ulid();
}
