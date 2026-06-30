import { Effect } from "effect";

export function BaseError<const Tag extends string>(tag: Tag) {
  class Base {
    readonly _tag = tag;
    constructor(readonly e: Error) {}
    static new(e: unknown) {
      if (e instanceof Error) {
        return new this(e);
      } else if (typeof e === "string") {
        return new this(new Error(e));
      }
      return new this(new Error("Unknown", { cause: e }));
    }
    static fail(e: unknown) {
      return Effect.fail(this.new(e));
    }
  }
  return Base;
}

export class NotFoundError extends BaseError("NotFoundError") {}
export class JsonError extends BaseError("JsonError") {}
export class TooBigError extends BaseError("TooBigError") {}
export class DuplicateError extends BaseError("DuplicateError") {}
export class InvalidShapeError extends BaseError("InvalidShapeError") {}
