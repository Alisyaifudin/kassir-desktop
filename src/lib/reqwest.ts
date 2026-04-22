import { Effect } from "effect";
import { BodyError, RequestError, ResponseError, ZodSchemaError } from "./effect-error";
import { z } from "zod";
import { fetch } from "@tauri-apps/plugin-http";

export function reqwest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Effect.Effect<
  {
    response: Response;
  },
  RequestError | ResponseError,
  never
>;
export function reqwest<Output>(
  input: RequestInfo | URL,
  schema: z.ZodType<Output>,
  init?: RequestInit,
): Effect.Effect<
  {
    response: Response;
    data: Output;
  },
  RequestError | BodyError | ResponseError | ZodSchemaError,
  never
>;
export function reqwest<Output>(
  input: RequestInfo | URL,
  second?: z.ZodType<Output> | RequestInit,
  third?: RequestInit,
) {
  return Effect.gen(function* () {
    const schema = second !== undefined && "safeParse" in second ? second : undefined;
    const init = second === undefined ? undefined : "safeParse" in second ? third : second;
    const response = yield* Effect.tryPromise({
      try: () => fetch(input, init),
      catch: (error) => RequestError.new(error),
    });

    if (!response.ok) {
      yield* ResponseError.fail(response);
    }
    if (schema === undefined) return { response };

    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => BodyError.new(error),
    });

    const parsed = schema.safeParse(json);
    if (!parsed.success) return yield* Effect.fail(new ZodSchemaError(parsed.error));
    return { response, data: parsed.data };
  });
}
