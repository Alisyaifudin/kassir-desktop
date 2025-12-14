import { generateRandomString } from "@oslojs/crypto/random";
import type { RandomReader } from "@oslojs/crypto/random";

const random: RandomReader = {
  read(bytes) {
    crypto.getRandomValues(bytes);
  },
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
// 10-characters long string consisting of the upper case letters
export function generateId() {
  return generateRandomString(random, alphabet, 10);
}
