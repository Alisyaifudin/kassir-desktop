import { Context, Effect } from "effect";
import { RecordFull } from "./type";
import { RecordAlreadyExistError, RecordError } from "./error";

export class RecordService extends Context.Tag("RecordService")<
  RecordService,
  {
    get: {
      range: (start: number, end: number) => Effect.Effect<RecordFull[], RecordError>;
    };
    add: {
      external: (record: RecordFull) => Promise<null | RecordError | RecordAlreadyExistError>;
    };
  }
>() {}
