import { extrasStore } from "../../store/extra";
import { TextError } from "~/components/TextError";
import { useSelector } from "@xstate/store/react";
import { Subtotal } from "./z-Subtotal";
import { ForEach } from "~/components/ForEach";
import { Item } from "./z-Item";
import { useMicro } from "~/hooks/use-micro";
import { key } from "../../utils/keys";
import { Effect, Either } from "effect";
import { tx } from "~/transaction-effect";
import { transformExtra } from "../../store/extra/transform-extra";
import { useSubtotal } from "../../store/product";
import Decimal from "decimal.js";
import { logOld } from "~/lib/utils";

export function ExtraList({ tab }: { tab: number }) {
  const subtotal = useSubtotal();
  const res = useMicro({
    fn: () => loader(subtotal, tab),
    key: key.extras,
  });
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight() {
      return <Wrapper />;
    },
  });
}

function loader(subtotal: Decimal, tab: number) {
  return Effect.gen(function* () {
    const raw = yield* tx.extra.getByTab(tab);
    const extras = transformExtra(subtotal, raw);
    extrasStore.trigger.init({ extras });
  });
}
function Wrapper() {
  const extras = useSelector(extrasStore, (state) => state.context);
  if (extras.length === 0) return;
  return (
    <>
      <Subtotal />
      <ForEach items={extras}>{(extra) => <Item extra={extra} />}</ForEach>
    </>
  );
}
