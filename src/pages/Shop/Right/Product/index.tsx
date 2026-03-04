import { Container } from "./z-Container";
import { Editable } from "./z-Editable";
import { Basic } from "./z-Basic";
import { ForEach } from "~/components/ForEach";
import { useSelector } from "@xstate/store/react";
import { memo } from "react";
import { useMicro } from "~/hooks/use-micro";
import { Effect, Either } from "effect";
import { tx } from "~/transaction-effect";
import { transformProduct } from "../../store/product/transform-product";
import { productsStore } from "../../store/product";
import { key } from "../../utils/keys";
import { logOld } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { useMode } from "../../use-transaction";

export function ProductList({ tab }: { tab: number }) {
  const res = useMicro({
    fn: () => loader(tab),
    key: key.products,
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

function loader(tab: number) {
  return Effect.gen(function* () {
    const raw = yield* tx.product.getByTab(tab);
    const products = transformProduct(raw);
    productsStore.trigger.init({ products });
  });
}

function Wrapper() {
  const ids = useSelector(productsStore, (state) => state.context).map((s) => s.id);
  const n = ids.length;
  const arr = Array.from({ length: n }).map((_, i) => i);
  return (
    <ForEach items={arr} extractKey={(i) => ids[n - i - 1]}>
      {(i) => <Item id={ids[n - i - 1]} index={n - i - 1} />}
    </ForEach>
  );
}

const Item = memo(({ id, index }: { id: string; index: number }) => {
  const mode = useMode();
  switch (mode) {
    case "buy":
      return (
        <Container id={id} index={index}>
          <Editable id={id} />
        </Container>
      );
    case "sell":
      return (
        <Container id={id} index={index}>
          <Basic id={id} />
        </Container>
      );
  }
});
