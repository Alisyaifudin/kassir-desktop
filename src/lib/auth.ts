import { invoke } from "@tauri-apps/api/core";
import { safeJSON } from "./utils";
import { z } from "zod";
import { Effect } from "effect";
import { InvalidCredential, InvokeError } from "./effect-error";


const userSchema = z.object({
  id: z.string().nonempty(),
  name: z.string(),
  role: z.enum(["admin", "user"]),
});

export type User = z.infer<typeof userSchema>

export let _user: undefined | User = undefined;

export class Unauthenticated extends Error {}


export const auth = {
  get() {
    if (_user === undefined) {
      const raw = localStorage.getItem("user");
      if (raw === null) {
        return undefined;
      }
      const [errJson, json] = safeJSON(raw);
      if (errJson) {
        localStorage.removeItem("user");
        return undefined;
      }
      const parsed = userSchema.safeParse(json);
      if (!parsed.success) {
        localStorage.removeItem("user");
        return undefined;
      }
      _user = parsed.data;
    }
    return _user;
  },
  user() {
    const user = this.get();
    if (user === undefined) throw new Unauthenticated("Unauthenticated");
    return user;
  },
  set(user?: User) {
    if (user === undefined) {
      localStorage.removeItem("user");
    } else {
      localStorage.setItem("user", JSON.stringify(user));
    }
    _user = user;
  },
  hash(password: string) {
    return Effect.tryPromise({
      try: () => invoke<string>("hash_password", { password }),
      catch: (e) => InvokeError.new(e, "Aplikasi bermasalah"),
    });
  },
  verify(password: string, storedHash: string) {
    return Effect.gen(function* () {
      const isMatch = yield* Effect.tryPromise({
        try: () =>
          invoke<boolean>("verify_password", {
            password,
            hash: storedHash,
          }),
        catch: (e) => InvokeError.new(e, "Aplikasi bermasalah"),
      });
      if (!isMatch) {
        return yield* Effect.fail(new InvalidCredential("Kata sandi salah"));
      }
      return yield* Effect.void;
    });
  },
};



