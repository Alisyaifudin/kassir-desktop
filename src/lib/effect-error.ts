import { Effect } from "effect";
import { To } from "react-router";

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

export class RedirectError {
  readonly _tag = "RedirectError";
  constructor(public to: To) {}
  static fail(to: To) {
    return Effect.fail(new RedirectError(to));
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

export class IOError {
  readonly _tag = "IOError";
  e: Error;
  constructor(error: unknown, msg?: string) {
    if (msg !== undefined) {
      this.e = new Error(msg, { cause: error });
    } else if (typeof error === "string") {
      this.e = new Error(error);
    } else {
      this.e = new Error("Io error", { cause: error });
    }
  }
}

export class ArrayBufferError {
  readonly _tag = "ArrayBufferError";
  e: Error;
  constructor(error: unknown) {
    if (typeof error === "string") {
      this.e = new Error(error);
    } else {
      this.e = new Error("Array buffer conversion error", { cause: error });
    }
  }
}

export class JsonError {
  readonly _tag = "JsonError";
  e: Error;
  constructor(error: unknown) {
    if (typeof error === "string") {
      this.e = new Error(error);
    } else {
      this.e = new Error("Json conversion error", { cause: error });
    }
  }
}

export class TooBigError {
  readonly _tag = "TooBigError";
  constructor(public size: number) {}
}

export class InvalidCredential {
  readonly _tag = "InvalidCredential";
  constructor(readonly msg: string) {}
}