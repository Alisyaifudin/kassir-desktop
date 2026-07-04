import { Context, Effect } from "effect";
import { InfoError } from "./error";

export { InfoError } from "./error";

export type Info = {
  address: string;
  footer: string;
  header: string;
  name: string;
};

export type InfoFull = Info & {
  showCashier: boolean;
};

export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    loader(): Effect.Effect<void, InfoError>;
    showCashier: {
      useShowCashier(): boolean;
      set(showCashier: boolean): Effect.Effect<void, InfoError>;
    };
    info: {
      useInfo(): Info;
      useName(): string;
      set(info: Info): Effect.Effect<void, InfoError>;
    };
  }
>() {}
