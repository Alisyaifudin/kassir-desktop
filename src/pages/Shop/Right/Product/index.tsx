import { Container } from "./Container";
import { Editable } from "./editable";
import { Basic } from "./Basic";
import { TextError } from "~/components/TextError";
import { ForEach } from "~/components/ForEach";
import { basicStore } from "../../use-transaction";
import { useStoreValue } from "@simplestack/store/react";
import { Product, productsStore, useInitProducts } from "./use-products-xstate";
import { Loading } from "~/components/Loading";
import { DefaultError, Result } from "~/lib/utils";
import { Product as ProductTX } from "~/transaction/product/get-by-tab";
import { useSelector } from "@xstate/store/react";

export function ProductList({
  products: promise,
}: {
  products: Promise<Result<DefaultError, ProductTX[]>>;
}) {
  const [loading, errMsg] = useInitProducts(promise);
  if (errMsg) return <TextError>{errMsg}</TextError>;
  if (loading) return <Loading />;
  return <Wrapper />;
}

function Wrapper() {
  const products = useSelector(productsStore, (state) => state.context);
  const n = products.length;
  const arr = Array.from({ length: n }).map((_, i) => i);
  return (
    <ForEach items={arr} extractKey={(i) => products[n - i - 1].id}>
      {(i) => <Item product={products[n - i - 1]} index={i} />}
    </ForEach>
  );
}

const Item = ({ product, index }: { product: Product; index: number }) => {
  const mode = useStoreValue(basicStore.select("mode"));
  switch (mode) {
    case "buy":
      return (
        <Container
          name={product.name}
          stock={product.stock}
          productId={product.product?.id}
          index={index}
        >
          <Editable product={product} />
        </Container>
      );
    case "sell":
      return (
        <Container
          name={product.name}
          stock={product.stock}
          productId={product.product?.id}
          index={index}
        >
          <Basic product={product} />
        </Container>
      );
  }
};
