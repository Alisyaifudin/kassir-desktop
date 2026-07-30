import { Context } from "effect";
import { Method, TabInfo } from "./type";

export class TransactionService extends Context.Tag("TransactionService")<
  TransactionService,
  {
    useManual: () => {
      codes: string[];
      name: string;
      qty: number;
      price: number;
    };
    set: {
      code: {
        edit: (i: number, code: string) => void;
        add: () => void;
        remove: (i: number) => void;
      };
      name: (name: string) => void;
      qty: (qty: number) => void;
      price: (price: number) => void;
    };
    getTab: () => Promise<string>;
    useLoad: (id: string) => void;
    useTabs: () => TabInfo[];
    useMethods: () => Method[];
  }
>() {}
