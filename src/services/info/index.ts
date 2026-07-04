import { Context } from "effect";
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
export class UseShowCashier extends Context.Tag("UseShowCashier")<
  UseShowCashier,
  () => boolean
>() {}
export class SetShowCashier extends Context.Tag("SetShowCashier")<
  SetShowCashier,
  (showCashier: boolean) => Promise<string | null>
>() {}
export class UseNameCashier extends Context.Tag("UseNameCashier")<UseNameCashier, () => string>() {}
export class UseInfoCashier extends Context.Tag("UseInfoCashier")<UseInfoCashier, () => Info>() {}
export class SetInfoCashier extends Context.Tag("SetInfoCashier")<
  SetInfoCashier,
  (info: Info) => Promise<string | null>
>() {}

export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    loader: () => Promise<null | InfoError>;
    showCashier: {
      useShowCashier: typeof UseShowCashier.Service;
      set: typeof SetShowCashier.Service;
    };
    info: {
      useInfo: typeof UseInfoCashier.Service;
      useName: typeof UseNameCashier.Service;
      set: typeof SetInfoCashier.Service;
    };
  }
>() {}
