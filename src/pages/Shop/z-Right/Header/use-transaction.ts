import { Result } from "~/lib/result";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";
import { tx } from "~/transaction";
import { initStore } from "../../use-transaction";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { TabInfo } from "~/transaction/transaction/get-all";
import { log } from "~/lib/log";
import { toast } from "sonner";

const KEY = "transaction";

export function useTransaction(tabs: [TabInfo, ...TabInfo[]], tab: number) {
  const navigate = useNavigate();
  useEffect(() => {
    async function init() {
      if (tab === undefined) return;
      if (tabs.find((t) => t.tab === tab) === undefined) {
        navigate(`/shop/${tabs[tabs.length - 1].tab}`);
        return;
      }
      const errMsg = await Effect.runPromise(loader(tab));
      if (errMsg !== null) {
        if (errMsg === "NotFound") {
          navigate(`/shop/${tabs[tabs.length - 1].tab}`);
          return;
        }
        toast.error(errMsg);
      }
    }
    init();
  }, [tab, navigate, tabs]);
}

export function revalidate() {
  Result.revalidate(KEY);
}

function loader(tab: number) {
  return Effect.gen(function* () {
    const transaction = yield* tx.transaction.get.byTab(tab).pipe(
      Effect.catchTag("NotFound", () => {
        return NotFound.fail("Transaksi tidak ditemukan");
      }),
    );
    initStore(transaction);
    return null;
  }).pipe(
    Effect.catchTag("NotFound", () => {
      const msg = "Transaksi tidak ditemukan " + tab;
      log.error(msg);
      return Effect.succeed("NotFound");
    }),
    Effect.catchTag("TxError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
