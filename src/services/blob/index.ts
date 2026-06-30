import { Context, Effect } from "effect";
import { BlobError } from "./error";

export class BlobService extends Context.Tag("RecordService")<
  BlobService,
  {
    convert: {
      fromObject: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries: Record<any, any>[],
      ) => Effect.Effect<Uint8Array<ArrayBufferLike>, BlobError>;
    };
  }
>() {}
