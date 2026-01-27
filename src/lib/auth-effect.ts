import { invoke } from "@tauri-apps/api/core";
import { safeJSON } from "./utils";
import { z } from "zod";
import { Effect } from "effect";
// import { jwt } from "./jwt";
export type User = {
  name: string;
  role: "admin" | "user";
};

let _user: undefined | User = undefined;

const userSchema = z.object({
  name: z.string(),
  role: z.enum(["admin", "user"]),
});

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
    if (user === undefined) throw new Error("Unauthenticated");
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

export type UserClaim = {
  name: string;
  role: "admin" | "user";
  exp: number;
};

export class InvokeError {
  readonly _tag = "InvokeError";
  constructor(readonly e: Error) {}
  static new(e: unknown, msg: string) {
    if (e instanceof Error) {
      e.message = msg;
      return new InvokeError(e);
    }
    if (typeof e === "string") {
      return new InvokeError(new Error(e));
    }
    const unknown = new Error(msg, { cause: e });
    return new InvokeError(unknown);
  }
}

export class InvalidCredential {
  readonly _tag = "InvalidCredential";
  constructor(readonly msg: string) {}
}
