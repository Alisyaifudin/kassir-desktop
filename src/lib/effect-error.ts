import { Data } from "effect";

export class NotFound extends Data.TaggedError("NotFound")<{ message: string }> {}
export class InvokeError extends Data.TaggedError("InvokeError")<{ message: string }> {}
export class InvalidCredential extends Data.TaggedError("InvalidCredential")<{ message: string }> {}

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

export class DuplicateError {
  readonly _tag = "DuplicateError";
  constructor(public name: string) {}
}
