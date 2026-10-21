import { Effect, Context, Data, Stream } from "effect";
import type { LogPage } from "./tail";

export class LogError extends Data.TaggedError("LogError")<{ message: string }> {}

export class LogService extends Context.Tag("LogService")<
  LogService,
  {
    lines: {
      /**
       * The tail of the application log, newest first, warnings included, with
       * the file's real line count. Every subscription reads the file afresh,
       * and so does every clear.
       */
      changes: Stream.Stream<LogPage, LogError>;
    };
    /** Empties the log file. Subscribers re-read it afterwards. */
    clear: () => Effect.Effect<void, LogError>;
  }
>() {}
