import { Effect } from "effect";
import { log } from "~/lib/log";
import { tx } from "~/transaction";
import { TabInfo } from "~/transaction/transaction/get-all";
import { revalidateTabs } from "../use-tabs";

export function programClearTab(tab: number, tabs: TabInfo[]) {
  return Effect.gen(function* () {
    yield* tx.transaction.delete(tab);
    if (tabs.length === 1) {
      yield* tx.transaction.add.new();
    }
    revalidateTabs();
    return null;
  }).pipe(
    Effect.catchTag("TooMany", (e) => {
      log.error(e.msg);
      return Effect.succeed(e.msg);
    }),
    Effect.catchTag("TxError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
