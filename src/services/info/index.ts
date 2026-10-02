import { Effect, Context, Data, Stream } from "effect";

export class InfoError extends Data.TaggedError("InfoError")<{ message: string }> {}

export type Info = {
  name: string;
  address: string;
  footer: string;
  header: string;
  showCashier: boolean;
};

export class InfoService extends Context.Tag("InfoService")<
  InfoService,
  {
    name: () => Effect.Effect<string, InfoError>;
    info: () => Effect.Effect<Info, InfoError>;
    set: (info: Info) => Effect.Effect<void, InfoError>;
    changes: Stream.Stream<Info, InfoError>;
  }
>() {}
