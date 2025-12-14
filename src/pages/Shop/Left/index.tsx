import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Search } from "./Tab/SearchBar";
import { ProductManual } from "./Tab/ProductManual";
import { Loading } from "~/components/Loading";
import { Summary } from "./Summary";
import React, { Suspense, use } from "react";
import { Precision } from "./Precision";
import { cn, Result } from "~/lib/utils";
import { css } from "../style.css";
import { TextError } from "~/components/TextError";
import { ExtraManual } from "./Tab/ExtraManual";
import { Method } from "~/database/method/get-all";
import { DBItems } from "../loader/get-db-items";
import { useSize } from "~/hooks/use-size";
import { Customer } from "~/database/customer/get-all";

export function Left({
  product,
  methods,
  customers,
}: {
  product: Promise<DBItems>;
  methods: Promise<Result<"Aplikasi bermasalah", Method[]>>;
  customers: Promise<Result<"Aplikasi bermasalah", Customer[]>>;
}) {
  const size = useSize();
  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden justify-between w-[35%] h-full",
        css.right[size].minWidth,
      )}
    >
      <Tabs
        defaultValue="auto"
        className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
      >
        <div className="flex items-center flex-wrap justify-between w-full">
          <TabsList>
            <TabsTrigger type="button" value="auto">
              Otomatis
            </TabsTrigger>
            <TabsTrigger type="button" value="man">
              Manual
            </TabsTrigger>
            <TabsTrigger type="button" value="add">
              Tambahan
            </TabsTrigger>
          </TabsList>
          <Precision />
        </div>
        <Suspense fallback={<Loading />}>
          <TabContent product={product} />
        </Suspense>
      </Tabs>
      <div style={{ flex: "0 0 auto" }}>
        <hr />
        <Summary customers={customers} methods={methods} />
      </div>
    </aside>
  );
}

function TabContent({ product }: { product: Promise<DBItems> }) {
  const [errMsg, prod] = use(product);
  if (errMsg) return <TextError>{errMsg}</TextError>;
  const { products, extras } = prod;
  return (
    <>
      <TabBtn value="auto">
        <Search products={products} extras={extras} />
      </TabBtn>
      <TabBtn value="man">
        <ProductManual products={products} />
      </TabBtn>
      <TabBtn value="add">
        <ExtraManual />
      </TabBtn>
    </>
  );
}

function TabBtn({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <TabsContent value={value} className="flex w-full flex-col px-1 gap-2  grow shrink basis-0">
      {children}
    </TabsContent>
  );
}
