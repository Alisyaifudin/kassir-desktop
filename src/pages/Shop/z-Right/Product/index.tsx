import { Container } from "./z-Container";
import { Editable } from "./z-Editable";
import { Basic } from "./z-Basic";
import { ForEach } from "~/components/ForEach";
import { useSelector } from "@xstate/store/react";
import { memo } from "react";
import { Product, productsStore } from "../../store/product";
import { TextError } from "~/components/TextError";
import { useMode } from "../../use-transaction";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Reorder } from "framer-motion";
import { queue } from "../../util-queue";
import { tx } from "~/transaction";

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

function handleReorder(products: Product[]) {
  productsStore.trigger.reorder({ products });
  queue.add(tx.product.update.reorder(products.map((p) => p.id)));
}

function Wrapper() {
  const products = useSelector(productsStore, (state) => state.context);
  return (
    <Reorder.Group className="flex flex-col-reverse" values={products} onReorder={handleReorder}>
      <ForEach items={products} extractKey={(product) => product.id}>
        {(product, i) => <Item product={product} index={i} />}
      </ForEach>
    </Reorder.Group>
  );
}

const Item = memo(function Item({ product, index }: { product: Product; index: number }) {
  const mode = useMode();
  switch (mode) {
    case "buy":
      return (
        <Container product={product} index={index}>
          <Editable item={product} />
        </Container>
      );
    case "sell":
      return (
        <Container product={product} index={index}>
          <Basic item={product} />
        </Container>
      );
  }
});
