import { Context, Effect } from "effect";
import { IoError } from "./error";

export class IoService extends Context.Tag("IoService")<
  IoService,
  {
    dialog: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: {
        name: string;
        extensions: string[];
      }[];
    }) => Effect.Effect<string, IoError>;
    save: (path: string, data: Uint8Array<ArrayBufferLike>) => Effect.Effect<void, IoError>;
  }
>() {}
