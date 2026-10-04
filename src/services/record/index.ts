import { Effect, Context, Data } from "effect";

export class RecordError extends Data.TaggedError("RecordError")<{ message: string }> {}

/** `outcoming` = penjualan (income), `incoming` = pembelian (expense). */
export type RecordMode = "incoming" | "outcoming";

/** Aggregates for one mode over a half-open range `[start, end)`. */
export type RecordSummary = {
  mode: RecordMode;
  /** Number of records in range. */
  count: number;
  /** Sum of grand totals (`record_total + record_rounding`) in range. */
  total: number;
};

export class RecordService extends Context.Tag("RecordService")<
  RecordService,
  {
    count: {
      summary: (start: number, end: number) => Effect.Effect<RecordSummary[], RecordError>;
    };
  }
>() {}
