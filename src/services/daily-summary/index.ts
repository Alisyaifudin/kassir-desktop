import { Context, Effect } from "effect";
import { DailySummaryError } from "./error";

export type Sign = "+" | "-";

export class DailySummaryService extends Context.Tag("DailySummaryService")<
  DailySummaryService,
  {
    total: (mode: DBNamespace.Mode) => Effect.Effect<
      {
        diffPercent?: number;
        sign: Sign;
        todayValue: number;
      },
      DailySummaryError
    >;
    count: () => Effect.Effect<
      {
        in: number;
        out: number;
      },
      DailySummaryError
    >;
  }
>() {}
