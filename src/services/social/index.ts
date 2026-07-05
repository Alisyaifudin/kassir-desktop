import { Context, Effect } from "effect";
import { Social } from "./type";
import { SocialError } from "./error";
export { SocialError } from "./error";

export class SocialService extends Context.Tag("SocialService")<
  SocialService,
  {
    loader(): Effect.Effect<void, SocialError>;
    useSocials(): Social[];
    add(name: string, value: string): Effect.Effect<void, SocialError>;
    update(social: { id: string; name: string; value: string }): Effect.Effect<void, SocialError>;
    delete(id: string): Effect.Effect<void, SocialError>;
  }
>() {}
