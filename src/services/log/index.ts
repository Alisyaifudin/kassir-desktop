import { Effect, Context, Data, Stream } from "effect";

export class LogError extends Data.TaggedError("LogError")<{ message: string }> {}

export class LogService extends Context.Tag("LogService")<
  LogService,
  {
    lines: {
      /**
       * The application log, newest first, without warnings. Every subscription
       * reads the file afresh, and so does every clear.
       */
      changes: Stream.Stream<string[], LogError>;
    };
    /** Empties the log file. Subscribers re-read it afterwards. */
    clear: () => Effect.Effect<void, LogError>;
  }
>() {}
