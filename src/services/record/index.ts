import { Context, Effect } from "effect";
import { Record } from "./type";
import { RecordAlreadyExistError, RecordError } from "./error";

export class RecordService extends Context.Tag("RecordService")<
  RecordService,
  {
    get: {
      range: (start: number, end: number) => Effect.Effect<Record[], RecordError>;
    };
    add: {
      external: (
        record: Record,
      ) => Effect.Effect<void, RecordError | RecordAlreadyExistError>;
    };
  }
>() {}
