import { useLoaderData } from "react-router";
import { NavList } from "../NavList";
import { Suspense, use } from "react";
import { LoadingBig } from "~/components/Loading";
import { DefaultError, Result } from "~/lib/utils";
import { Product } from "~/database/product/get-performance";
import { TextError } from "~/components/TextError";
import { ItemTable } from "./ItemTable";
import { Panel } from "./Panel";

export default function Page() {
  const items = useLoaderData();
  return (
    <>
      <NavList selected="performance"></NavList>
      <div className="flex flex-col gap-2 py-1 flex-1 overflow-hidden">
        <Panel />
        <Suspense fallback={<LoadingBig />}>
          <Wrapper items={items} />
        </Suspense>
      </div>
    </>
  );
}

function Wrapper({ items: promise }: { items: Promise<Result<DefaultError, Product[]>> }) {
  const [errMsg, items] = use(promise);
  if (errMsg !== null) return <TextError>{errMsg}</TextError>;
  return (
    <div className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <ItemTable items={items} />
      </div>
    </div>
  );
}
