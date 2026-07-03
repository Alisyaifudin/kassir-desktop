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

export class ShowCashierService extends Context.Tag("ShowCashierService")<
  ShowCashierService,
  {
    useShowCashier(): boolean;
    set(showCashier: boolean): Promise<string | null>;
  }
>() {}

export class InfoDetailService extends Context.Tag("InfoDetailService")<
  InfoDetailService,
  {
    useName: () => string;
    useInfo(): Info;
    set(info: Info): Promise<string | null>;
  }
>() {}

export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    loader: () => Promise<null | InfoError>;
    showCashier: {
      useShowCashier(): boolean;
      set(showCashier: boolean): Promise<string | null>;
    };
    info: {
      useName: () => string;
      useInfo(): Info;
      set(info: Info): Promise<string | null>;
    };
  }
>() {}
