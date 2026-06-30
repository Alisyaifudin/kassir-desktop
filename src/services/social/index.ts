import { Context, Effect } from "effect";
import { AsyncDataState, Status } from "~/lib/state";
import { Social } from "./type";
import { SocialError } from "./error";

export class SocialService extends Context.Tag("SocialService")<
  SocialService,
  {
    useLoad(): Status<SocialError>;
    socials: AsyncDataState<Social[], string>;
    add(name: string, value: string): Effect.Effect<string, SocialError>;
    update(id: string, name: string, value: string): Effect.Effect<void, SocialError>;
    delete(id: string): Effect.Effect<void, SocialError>;
  }
>() {}
