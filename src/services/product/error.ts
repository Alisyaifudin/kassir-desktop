import { Effect } from "effect";
import { BaseError } from "~/lib/error-effect";

export class ProductError extends BaseError("ProductError") {}

export class UniqueCodeError {
  readonly _tag = "UniqueCodeError";
  constructor(
    public inserted: { code: string; name: string },
    public existing: { code: string; name: string },
  ) {}
  static new(inserted: { code: string; name: string }, existing: { code: string; name: string }) {
    return new this(inserted, existing);
  }
  static fail(inserted: { code: string; name: string }, existing: { code: string; name: string }) {
    return Effect.fail(this.new(inserted, existing));
  }
}

export class ProductAlreadyExistError {
  readonly _tag = "ProductAlreadyExistError";
  constructor(
    public inserted: { id: string; name: string },
    public existing: { id: string; name: string },
  ) {}
  static new(inserted: { id: string; name: string }, existing: { id: string; name: string }) {
    return new this(inserted, existing);
  }
  static fail(inserted: { id: string; name: string }, existing: { id: string; name: string }) {
    return Effect.fail(this.new(inserted, existing));
  }
}
