import { Context, Effect } from "effect";
import { AsyncDataState, Status } from "~/lib/state";
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
    useLoad: () => Status<InfoError>;
    info: AsyncDataState<Info, string>;
    showCashier: AsyncDataState<boolean, string>;
    useName: () => string;
    set: {
      info: (info: Info) => Effect.Effect<Info, string>;
      showCashier: (showCashier: boolean) => Effect.Effect<boolean, string>;
    };
  }
>() {}
