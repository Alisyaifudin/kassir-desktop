import { Context, Effect } from "effect";
import { AsyncDataState, Status } from "~/lib/state";
import { LogError } from "./error";

export class LogService extends Context.Tag("LogService")<
  LogService,
  {
    put(e: unknown): Effect.Effect<void>;
    load(): Effect.Effect<void, LogError>;
    useStatus(): Status<LogError>;
    log: AsyncDataState<string[], string>;
    clear(): Effect.Effect<void, LogError>;
  }
>() {}

export const LogPut = (e: unknown) => LogService.pipe(Effect.flatMap((log) => log.put(e)));
export const LogAnd = <T, E, R>(e: unknown, effect: Effect.Effect<T, E, R>) =>
  Effect.gen(function* () {
    const log = yield* LogService;
    log.put(e);
    return yield* effect;
  });
