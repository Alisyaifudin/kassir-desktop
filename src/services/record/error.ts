import { Effect } from "effect";
import { BaseError } from "~/lib/error-effect";

export class RecordError extends BaseError("RecordError") {}

export class RecordAlreadyExistError {
  readonly _tag = "RecordAlreadyExistError";
  constructor(
    public inserted: { id: string; paidAt: number },
    public existing: { id: string; paidAt: number },
  ) {}
  static new(inserted: { id: string; paidAt: number }, existing: { id: string; paidAt: number }) {
    return new this(inserted, existing);
  }
  static fail(inserted: { id: string; paidAt: number }, existing: { id: string; paidAt: number }) {
    return Effect.fail(this.new(inserted, existing));
  }
}
