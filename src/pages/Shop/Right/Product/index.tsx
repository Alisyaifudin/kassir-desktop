import { Container } from "./Container";
import { Editable } from "./editable";
import { Basic } from "./Basic";
import { TextError } from "~/components/TextError";
import { ForEach } from "~/components/ForEach";
import { basicStore } from "../../use-transaction";
import { productsStore, useInitProducts } from "./use-products";
import { useAtom, useSelector } from "@xstate/store/react";
import { memo } from "react";

export function ProductList() {
  const errMsg = useInitProducts();
  if (errMsg) return <TextError>{errMsg}</TextError>;
  return <Wrapper />;
}

function Wrapper() {
  const ids = useSelector(productsStore, (state) => state.context).map((s) => s.id);
  const n = ids.length;
  const arr = Array.from({ length: n }).map((_, i) => i);
  return (
    <ForEach items={arr} extractKey={(i) => ids[n - i - 1]}>
      {(i) => <Item id={ids[n - i - 1]} index={i} />}
    </ForEach>
  );
}

const Item = memo(({ id, index }: { id: string; index: number }) => {
  const mode = useAtom(basicStore, (state) => state.mode);

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
