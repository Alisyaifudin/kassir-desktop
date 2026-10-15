import { Effect } from "effect";
import { log } from "~/lib/log";
import type { RecordFull } from "~/services/record";
import { service } from "~/services";
import { programPrint } from "~/pages/Setting/Printer/util-program-print";

/** Print this record's receipt, reading its contact lines from the social service. */
export function programPrintReceipt(record: RecordFull) {
  return Effect.gen(function* () {
    const socials = yield* service.social.get.all();
    return yield* programPrint({
      record,
      products: record.listings,
      extras: record.extras,
      socials,
    });
  }).pipe(
    Effect.catchAll((error) => {
      log.error(error.message);
      return Effect.succeed(error.message);
    }),
  );
}
