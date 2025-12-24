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
import { useQuery } from "./use-query";
import { Input } from "~/components/ui/input";
import { Panel } from "./Panel";

export default function Page() {
  const items = useLoaderData<Loader>();
  const [query, setQuery] = useQuery();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value);
  };
  return (
    <>
      <NavList selected="products">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 flex-1 overflow-hidden">
        <Panel />
        <Input
          className="mx-1"
          type="search"
          placeholder="Cari..."
          value={query}
          onChange={handleChange}
          aria-autocomplete="list"
        />
        <Suspense fallback={<LoadingBig />}>
          <Wrapper items={items} />
        </Suspense>
      </div>
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
