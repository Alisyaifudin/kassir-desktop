import { LoadingFull } from "~/components/Loading";
import { useFilterProducts } from "./use-products";
import { ProductList } from "./z-ProductList";
import { ProductPanel } from "./z-ProductPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useFilterExtras } from "./use-extras";
import { ExtraList } from "./z-ExtraList";
import { ExtraPanel } from "./z-ExtraPanel";
import { logOld } from "~/lib/utils";
import { Suspense } from "react";
import { TextError } from "~/components/TextError";
import { useTab } from "./use-tab";
import { useMicro } from "~/hooks/use-micro";
import { db } from "~/database-effect";
import { Either } from "effect";
import { Layout } from "./z-Layout";

export default function Page() {
  const [tab, setTab] = useTab();
  return (
    <Layout className="flex flex-col gap-5 py-2 px-0.5 flex-1">
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
          <Suspense fallback={<LoadingFull />}>
            <ProductEntries />
          </Suspense>
        </TabsContent>
        <TabsContent value="extra" className="overflow-hidden flex-1 w-full flex flex-col">
          <Suspense fallback={<LoadingFull />}>
            <ExtraEntries />
          </Suspense>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

function ProductEntries() {
  const res = useMicro({
    fn: () => db.product.get.all(),
    key: "extras",
  });
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight(all) {
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
    },
  });
}

function ExtraEntries() {
  const res = useMicro({
    fn: () => db.extra.get.all(),
    key: "extras",
  });
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight(all) {
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
    },
  });
}
