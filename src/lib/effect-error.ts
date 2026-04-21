import { Effect } from "effect";
import { To } from "react-router";
import { ZodError } from "zod";

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

export class DuplicateError {
  readonly _tag = "DuplicateError";
  constructor(public name: string) {}
}

export class ManyDuplicateError {
  readonly _tag = "ManyDuplicateError";
  constructor(public products: { new: string; current: string }[]) {}
}
export class RequestError {
  readonly _tag = "RequestError";
  constructor(readonly error: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new RequestError(e);
    }
    const unknown = new Error("Unknown Error", { cause: e });
    return new RequestError(unknown);
  }
  static fail(e: unknown) {
    return Effect.fail(RequestError.new(e));
  }
}

export class ResponseError {
  readonly _tag = "ResponseError";
  constructor(readonly response: Response) {}
  static fail(response: Response) {
    return Effect.fail(new ResponseError(response));
  }
}

export class BodyError {
  readonly _tag = "BodyError";
  constructor(readonly error: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new BodyError(e);
    }
    const unknown = new Error("Unknown Error", { cause: e });
    return new BodyError(unknown);
  }
  static fail(e: unknown) {
    return Effect.fail(BodyError.new(e));
  }
}

export class ZodSchemaError<Input> {
  readonly _tag = "ZodSchemaError";
  constructor(readonly error: ZodError<Input>) {} // Also properly typed here
}