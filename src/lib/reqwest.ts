import { Effect } from "effect";
import { BodyError, RequestError, ResponseError, ZodSchemaError } from "./effect-error";
import { ZodType, ZodTypeDef } from "zod";
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
export function reqwest<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  input: RequestInfo | URL,
  schema: ZodType<Output, Def, Input>,
  init?: RequestInit,
): Effect.Effect<
  {
    response: Response;
    data: Output; // <-- Now properly typed!
  },
  RequestError | BodyError | ResponseError | ZodSchemaError<Output>,
  never
>;
export function reqwest<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  input: RequestInfo | URL,
  second?: ZodType<Output, Def, Input> | RequestInit,
  third?: RequestInit,
) {
  return Effect.gen(function* () {
    const schema = second !== undefined && "parse" in second ? second : undefined;
    const init = second === undefined ? undefined : "parse" in second ? third : second;
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
    return { response, data: parsed.data }; // data is now typed as Output
  });
}
