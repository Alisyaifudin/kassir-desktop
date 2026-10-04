import { Effect, Layer } from "effect";
import { RecordError, RecordService, type RecordMode, type RecordSummary } from ".";
import { DatabaseService } from "../db";

type SummaryRow = {
  mode: RecordMode;
  count: number;
  total: number;
};

// Records are a queried domain: they do not fit a `SubscriptionRef` (64k rows),
// so the read side exposes query Effects instead of a `changes` stream.
// `ROUND(…, record_fix)` reproduces the per-record precision the legacy
// `count.total` applied before summing.
const SELECT_SUMMARY = `
  SELECT
    record_mode AS mode,
    COUNT(*) AS count,
    SUM(ROUND(record_total + record_rounding, record_fix)) AS total
  FROM records
  WHERE record_deleted_at IS NULL
    AND record_paid_at >= $1 AND record_paid_at < $2
  GROUP BY record_mode`;

export const RecordLive = Layer.effect(
  RecordService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      count: {
        summary: (start, end) =>
          db.selectMany<SummaryRow>(SELECT_SUMMARY, [start, end]).pipe(
            Effect.mapError((error) => new RecordError({ message: error.message })),
            Effect.map((rows): RecordSummary[] =>
              rows.map((row) => ({ mode: row.mode, count: row.count, total: row.total })),
            ),
          ),
      },
    };
  }),
);
