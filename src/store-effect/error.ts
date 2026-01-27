// export class LoadError {
//   readonly _tag = "LoadError";
//   constructor(readonly e: Error) {}
//   static new(e: unknown) {
//     if (e instanceof Error) {
//       return new LoadError(e);
//     }
//     const unknown = new Error("Unknown", { cause: e });
//     return new LoadError(unknown);
//   }
// }

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
}
