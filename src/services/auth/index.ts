import { Effect, Context, Data, Stream } from "effect";
import type { Role } from "../cashier";

export class AuthError extends Data.TaggedError("AuthError")<{ message: string }> {}

export type User = {
  id: string;
  name: string;
  role: Role;
};

export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    get: () => Effect.Effect<User | null, AuthError>;
    set: (user: User | null) => Effect.Effect<void, AuthError>;
    changes: Stream.Stream<User | null, AuthError>;
  }
>() {}
