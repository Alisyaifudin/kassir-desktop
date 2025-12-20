import { DefaultError, Result } from "~/lib/utils";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { NavList } from "../NavList";
import { LoadingBig } from "~/components/Loading";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { Item } from "~/database/product/get-by-range";
import { Summary } from "./Summary";
import { ProductList } from "./ProductList";

export default function Page() {
  const items = useLoaderData<Loader>();
  return (
    <>
      <NavList selected="products">
        <Summary />
      </NavList>
      <Suspense fallback={<LoadingBig />}>
        <Wrapper items={items} />
      </Suspense>
    </>
  );
}

function Wrapper({ items: promise }: { items: Promise<Result<DefaultError, Item[]>> }) {
  const [errMsg, items] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return <ProductList items={items} />;
}
