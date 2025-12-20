import { LoadingBig } from "~/components/Loading";
import { useFilterProducts } from "./use-products";
import { ProductList } from "./ProductList";
import { ProductPanel } from "./ProductPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useFilterExtras } from "./use-extras";
import { ExtraList } from "./ExtraList";
import { ExtraPanel } from "./ExtraPanel";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Result } from "~/lib/utils";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { useScroll } from "~/hooks/use-scroll";
import { Product } from "~/database/product/caches";
import { Extra } from "~/database/extra/caches";
import { useTab } from "./use-tab";

export default function Page() {
  const { extras, products } = useLoaderData<Loader>();
  const [ref, handleScroll] = useScroll();
  const [tab, setTab] = useTab();
  return (
    <main ref={ref} onScroll={handleScroll} className="flex flex-col gap-5 py-2 px-0.5 flex-1">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v)}
        className="flex items-start flex-col flex-1 overflow-hidden"
      >
        <TabsList>
          <TabsTrigger value="product">Produk</TabsTrigger>
          <TabsTrigger value="extra">Biaya Lainnya</TabsTrigger>
        </TabsList>
        <TabsContent value="product" className="overflow-hidden flex-1 w-full flex flex-col">
          <Suspense fallback={<LoadingBig />}>
            <ProductComp products={products} />
          </Suspense>
        </TabsContent>
        <TabsContent value="extra" className="overflow-hidden flex-1 w-full flex flex-col">
          <Suspense fallback={<LoadingBig />}>
            <ExtraComp extras={extras} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ProductComp({
  products: promise,
}: {
  products: Promise<Result<"Aplikasi bermasalah", Product[]>>;
}) {
  const [errMsg, all] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  const products = useFilterProducts(all);
  return (
    <>
      <ProductPanel productsLength={products.length} />
      <div className="flex-1 overflow-hidden">
        <div className="flex max-h-full overflow-hidden">
          <ProductList products={products} />
        </div>
      </div>
    </>
  );
}

function ExtraComp({
  extras: promise,
}: {
  extras: Promise<Result<"Aplikasi bermasalah", Extra[]>>;
}) {
  const [errMsg, all] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  const extras = useFilterExtras(all);
  return (
    <>
      <ExtraPanel length={extras.length} />
      <div className="flex-1 overflow-hidden">
        <div className="flex max-h-full overflow-hidden">
          <ExtraList extras={extras} />
        </div>
      </div>
    </>
  );
}
