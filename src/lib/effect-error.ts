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
