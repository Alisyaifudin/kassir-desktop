import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { loadDetailRecord } from "../../Record/Item/use-data";
import { programPrint } from "../../setting/Printer/util-program-print";

export function programPrintReceipt(recordId: string) {
  return Effect.gen(function* () {
    const data = yield* loadDetailRecord(recordId);
    const socials = yield* db.social.get.all();
    yield* programPrint({
      record: data.record,
      products: data.products,
      extras: data.extras,
      socials,
    });
    return null;
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "DbError":
          log.error(e.e);
          return Effect.succeed(e.e.message);
        case "NotFound":
          return Effect.succeed("Transaksi tidak ditemukan");
        default:
          log.error("Unknown error in print receipt");
          return Effect.succeed("Gagal mencetak");
      }
    }),
  );
}
