import { ProductList } from "./Product";
import { ExtraList } from "./Extra";
import { Tab } from "./Tab";
import { GrandTotal } from "./GrandTotal";
import { Header } from "./Header";
import { Loading } from "~/components/Loading";
import { Suspense } from "react";
import { cn, DefaultError, Result } from "~/lib/utils";
import { Customer } from "./Customer";
import { TabInfo } from "~/transaction/transaction/get-all";
import { Product } from "~/transaction/product/get-by-tab";
import { Extra } from "~/transaction/extra/get-by-tab";

export function Right({
  products,
  extras,
  tabs,
}: {
  products: Promise<Result<DefaultError, Product[]>>;
  extras: Promise<Result<"Aplikasi bermasalah", Extra[]>>;
  tabs: TabInfo[];
}) {
  return (
    <div className="border-r flex-1 flex flex-col m-1 gap-2">
      <div className="outline flex-1 p-1 flex flex-col gap-1 overflow-hidden">
        <div className="flex flex-col">
          <Tab tabs={tabs} />
          <Header />
        </div>
        <div className={cn("flex flex-1 flex-col overflow-y-auto min-h-0 h-full")}>
          <Suspense fallback={<Loading />}>
            <ExtraList extras={extras} />
          </Suspense>
          <Suspense fallback={<Loading />}>
            <ProductList products={products} />
          </Suspense>
        </div>
      </div>
      <Customer />
      <GrandTotal />
    </div>
  );
}
