import { Result } from "~/lib/result";
import { useSubtotal } from "../../store/product";
import Decimal from "decimal.js";
import { Effect } from "effect";
import { tx } from "~/transaction";
import { transformExtra } from "../../store/extra/transform-extra";
import { extrasStore } from "../../store/extra";
import { useTab } from "../../use-tab";

const KEY = "extra-list";

export function useData() {
  const [tab] = useTab();
  const subtotal = useSubtotal();
  const res = Result.use({
    fn: () => loader(subtotal, tab),
    key: KEY,
    deps: [tab],
  });
  return res;
}

function loader(subtotal: Decimal, tab: number) {
  return Effect.gen(function* () {
    const raw = yield* tx.extra.getByTab(tab);
    const extras = transformExtra(subtotal, raw);
    extrasStore.trigger.init({ extras });
  });
}
