import { Context, Effect } from "effect";
import { HashError, InvalidPassword } from "./error";
export { HashError, InvalidPassword } from "./error";

export class HashService extends Context.Tag("HashService")<
  HashService,
  {
    hash: (str: string) => Effect.Effect<string, HashError>;
    verify: (password: string, hash: string) => Effect.Effect<void, HashError | InvalidPassword>;
  }
>() {}
