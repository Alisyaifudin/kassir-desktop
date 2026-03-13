import { Container } from "./z-Container";
import { Editable } from "./z-Editable";
import { Basic } from "./z-Basic";
import { ForEach } from "~/components/ForEach";
import { useSelector } from "@xstate/store/react";
import { memo } from "react";
import { productsStore } from "../../store/product";
import { TextError } from "~/components/TextError";
import { useMode } from "../../use-transaction";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";

export function ProductList() {
  const res = useData();
  return Result.match(res, {
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess() {
      return <Wrapper />;
    },
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

const Item = memo(function Item({ id, index }: { id: string; index: number }) {
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
