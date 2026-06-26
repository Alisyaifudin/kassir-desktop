import { Context, Effect } from "effect";

export class LogService extends Context.Tag("LogService")<
  LogService,
  { put(e: unknown): Effect.Effect<void> }
>() {}

export const LogPut = (e: unknown) => LogService.pipe(Effect.flatMap((log) => log.put(e)));
