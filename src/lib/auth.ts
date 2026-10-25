import { invoke } from "@tauri-apps/api/core";
import { Effect } from "effect";
import { InvalidCredential, InvokeError } from "./effect-error";

export class Unauthenticated extends Error {}

export function hash(password: string) {
  return Effect.tryPromise({
    try: () => invoke<string>("hash_password", { password }),
    catch: () => new InvokeError({ message: "Aplikasi bermasalah" }),
  });
}

export function verify(password: string, storedHash: string) {
  return Effect.gen(function* () {
    const isMatch = yield* Effect.tryPromise({
      try: () =>
        invoke<boolean>("verify_password", {
          password,
          hash: storedHash,
        }),
      catch: () => new InvokeError({ message: "Aplikasi bermasalah" }),
    });
    if (!isMatch) {
      return yield* Effect.fail(new InvalidCredential({ message: "Kata sandi salah" }));
    }
  });
}
