export class ReadError {
  readonly _tag = "ReadError";
  constructor(readonly e: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new ReadError(e);
    }
    const unknown = new Error("Unknown", { cause: e });
    return new ReadError(unknown);
  }
}

export class WriteError {
  readonly _tag = "WriteError";
  constructor(readonly e: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new WriteError(e);
    }
    const unknown = new Error("Unknown", { cause: e });
    return new WriteError(unknown);
  }
}
