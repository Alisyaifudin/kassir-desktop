import { Context } from "effect";
import { Social } from "./type";
import { SocialError } from "./error";

export class SocialService extends Context.Tag("SocialService")<
  SocialService,
  {
    loader(): Promise<SocialError | null>;
    useSocials(): Social[];
    set(social: { id: string; name: string; value: string }): Promise<string | null>;
    add(name: string, value: string): Promise<string | null>;
    delete(id: string): Promise<string | null>;
  }
>() {}
