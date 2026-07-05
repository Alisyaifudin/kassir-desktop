import { Effect } from "effect";
import { MoneyService } from "~/services/money";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";

/**
 * Pure Effect program for downloading pocket money data as JSON.
 * page.tsx wraps this in promisify to create the callback.
 */
export function downloadEffect(pocketId: string, name: string) {
  return Effect.gen(function* () {
    const moneyService = yield* MoneyService;
    const ioService = yield* IoService;
    const blobService = yield* BlobService;
    const money = yield* moneyService.all(pocketId);
    const data = yield* blobService.convert.fromObject(money);
    const fileName = `${Date.now()}-${name}.json`;
    const filePath = yield* ioService.dialog({
      title: "Simpan Data",
      defaultPath: fileName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    yield* ioService.save(filePath, data);
    return null;
  }).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message)));
}
