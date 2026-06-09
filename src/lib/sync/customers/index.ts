import { Effect } from "effect";
import { merge } from "./merge";
import { push } from "./push";
import { pull } from "./pull";

export function syncCustomer(
  token: string,
  cb: {
    uploadCount: (currentSize: number, totalSize: number) => void;
    downloadCount: (currentSize: number, totalSize: number) => void;
  },
) {
  return Effect.gen(function* () {
    const pulledData = yield* pull(token, cb.downloadCount);
    yield* merge(pulledData);
    yield* push(token, cb.uploadCount);
  });
}
