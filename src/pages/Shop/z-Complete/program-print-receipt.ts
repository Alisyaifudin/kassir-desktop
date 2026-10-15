import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";
import { programPrint } from "../../Setting/Printer/util-program-print";

/** Read a committed record from the service and print its receipt. */
export function programPrintReceipt(recordId: string) {
  return Effect.gen(function* () {
    const [record, socials] = yield* Effect.all([
      service.record.get.byId(recordId),
      service.social.get.all(),
    ]);
    return yield* programPrint({
      record,
      products: record.listings,
      extras: record.extras,
      socials,
    });
  }).pipe(
    Effect.catchTag("NotFound", () => Effect.succeed("Transaksi tidak ditemukan")),
    Effect.catchAll((error) => {
      log.error(error.message);
      return Effect.succeed(error.message);
    }),
  );
}
