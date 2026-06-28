import { Context, Effect } from "effect";
import { AggregateError } from "./error";

type Sign = "+" | "-";

export class AggregateService extends Context.Tag("AggregateService")<
  AggregateService,
  {
    total: (mode: DBNamespace.Mode) => Effect.Effect<
      {
        diffPercent?: number;
        sign: Sign;
        todayValue: number;
      },
      AggregateError
    >;
    count: Effect.Effect<
      {
        in: number;
        out: number;
      },
      AggregateError
    >;
  }
>() {}
