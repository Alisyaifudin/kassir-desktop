import { Context, Effect } from "effect";
import { BaseError } from "~/lib/error-effect";

export class HashError extends BaseError("HashError") {}
export class InvalidPassword extends BaseError("InvalidPassword") {}

export class HashService extends Context.Tag("HashService")<
  HashService,
  {
    hash: (str: string) => Effect.Effect<string, HashError>;
    verify: (password: string, hash: string) => Effect.Effect<void, HashError | InvalidPassword>;
  }
>() {}
