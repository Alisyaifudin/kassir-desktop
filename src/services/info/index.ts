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

export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    loader: () => Promise<null | InfoError>;
    info: {
      useInfo(): Info;
      set(info: Info): Promise<string | null>;
    };
    showCashier: {
      useShowCashier(): boolean;
      set(showCashier: boolean): Promise<string | null>;
    };
    useName: () => string;
  }
>() {}
