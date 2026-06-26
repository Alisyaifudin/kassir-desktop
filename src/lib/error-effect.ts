import { Effect } from "effect";

export class StoreError {
  readonly _tag = "StoreError";
  constructor(readonly e: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new StoreError(e);
    }
    const unknown = new Error("Unknown", { cause: e });
    return new StoreError(unknown);
  }
  static fail(e: unknown) {
    return Effect.fail(StoreError.new(e));
  }
}

export class DbError {
  readonly _tag = "DbError";
  constructor(readonly e: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new DbError(e);
    } else if (typeof e === "string") {
      const error = new Error(e);
      return new DbError(error);
    }
    const unknown = new Error("Unknown", { cause: e });
    return new DbError(unknown);
  }
  static fail(e: unknown) {
    return Effect.fail(DbError.new(e));
  }
}

export class TxError {
  readonly _tag = "TxError";
  constructor(readonly e: Error) {}
  static new(e: unknown) {
    if (e instanceof Error) {
      return new TxError(e);
    } else if (typeof e === "string") {
      const error = new Error(e);
      return new TxError(error);
    }
    const unknown = new Error("Unknown", { cause: e });
    return new TxError(unknown);
  }
}