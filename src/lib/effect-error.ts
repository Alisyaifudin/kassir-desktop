import { Effect } from "effect";

export class TooMany {
  readonly _tag = "TooMany";
  constructor(readonly msg: string) {}
  static new(msg: string) {
    return new TooMany(msg);
  }
}

export class NotFound {
  readonly _tag = "NotFound";
  constructor(readonly msg: string) {}
  static new(msg: string) {
    return new NotFound(msg);
  }
  static fail(msg: string) {
    return Effect.fail(new NotFound(msg));
  }
}

export class InvokeError {
  readonly _tag = "InvokeError";
  constructor(readonly e: Error) {}
  static new(e: unknown, msg: string) {
    if (e instanceof Error) {
      e.message = msg;
      return new InvokeError(e);
    }
    if (typeof e === "string") {
      return new InvokeError(new Error(e));
    }
    const unknown = new Error(msg, { cause: e });
    return new InvokeError(unknown);
  }
}