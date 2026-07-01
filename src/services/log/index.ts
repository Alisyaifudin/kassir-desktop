import { Context, Effect } from "effect";
import { LogError } from "./error";

export class LogService extends Context.Tag("LogService")<
  LogService,
  {
    put(e: unknown): Effect.Effect<void>;
    loader(): Promise<LogError | null>;
    useLog(): string[];
    clear(): Promise<string | null>;
  }
>() {}

export const LogPut = (e: unknown) => LogService.pipe(Effect.flatMap((log) => log.put(e)));
export const LogAnd = <T, E, R>(e: unknown, effect: Effect.Effect<T, E, R>) =>
  Effect.gen(function* () {
    const log = yield* LogService;
    log.put(e);
    return yield* effect;
  });
