import { useTab } from "../../use-tab";
import { Effect, Either } from "effect";
import { tx } from "~/transaction-effect";
import { log } from "~/lib/log";
import { toast } from "sonner";
import { revalidateTabs } from "./use-tabs";

export function useAdd() {
  const [, setTab] = useTab();
  async function handleNew() {
    const either = await Effect.runPromise(program);
    Either.match(either, {
      onLeft(error) {
        switch (error._tag) {
          case "TxError":
            log.error(error.e);
            toast.error(error.e.message);
            break;
          case "TooMany":
            toast.error(error.msg);
            break;
        }
      },
      onRight(info) {
        revalidateTabs();
        setTab(info.tab);
      },
    });
  }
  return handleNew;
}

const program = Effect.gen(function* () {
  const info = yield* tx.transaction.add.new();
  return info;
}).pipe(Effect.either);
