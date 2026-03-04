import { Right } from "./Right";
import { TextError } from "~/components/TextError";
import { useShortcut } from "./use-shortcut";
import { useMicro } from "~/hooks/use-micro";
import { Effect, Either } from "effect";
import { tx } from "~/transaction-effect";
import { logOld } from "~/lib/utils";
import { tabsStore, useTab } from "./Right/Header/use-tab";
import { key } from "./utils/keys";
import { TabInfo } from "~/transaction-effect/transaction/get-all";
import { customerStore } from "./Right/CustomerDialog/use-customer";
import { basicStore, manualStore } from "./use-transaction";
import { Left } from "./Left";

export default function Page() {
  useShortcut();
  const [tab] = useTab();
  const res = useMicro({
    fn: () => loader(tab),
    key: key.transaction,
  });
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return (
        <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
          <TextError>{e.message}</TextError>
        </main>
      );
    },
    onRight() {
      return (
        <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
          <div className="gap-2 pt-1 flex h-full">
            uwu
            {/* <Left />
            <Right /> */}
          </div>
        </main>
      );
    },
  });
}

function loader(tab?: number) {
  return Effect.gen(function* () {
    // const tabs = yield* tx.transaction.get.all();
    // tabsStore.set(tabs);
    // const tab = yield* guard(tabs, rawTab);
    // setTab(tab);
    if (tab === undefined) return;
    const { fix, customer, extra, methodId, mode, note, product, query } =
      yield* tx.transaction.get.byTab(tab);
    basicStore.set({
      fix,
      methodId,
      mode,
      note,
      query,
      rounding: 0,
    });
    customerStore.set(customer);
    manualStore.set({
      extra,
      product,
    });
    // tabsStore.set(tabs);
  }).pipe(
    Effect.catchTag("NotFound", () => {
      return Effect.void;
    }),
  );
}

function guard(tabs: TabInfo[], rawTab?: number) {
  if (tabs.length === 0) {
    return tx.transaction.add.new();
  } else if (rawTab !== undefined && tabs.map((t) => t.tab).includes(rawTab)) {
    return Effect.succeed(rawTab);
  } else {
    const tab = tabs[tabs.length - 1].tab;
    return Effect.succeed(tab);
  }
}
