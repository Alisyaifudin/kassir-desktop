import { Loading } from "~/components/Loading";
import { useFilterProducts } from "./use-products";
import { ProductList } from "./ProductList";
import { PanelProduct } from "./PanelProduct";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useFilterAdditionals } from "./use-additionals";
import { AdditionalList } from "./AdditionalList";
import { useSearchParams } from "./use-search-params";
import { PanelAdditional } from "./PanelAdditional";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { cn, Result, sizeClass } from "~/lib/utils";
import { Suspense, use } from "react";
import { TextError } from "~/components/TextError";
import { Size } from "~/lib/store-old";
import { useScroll } from "~/hooks/use-scroll";

export default function Page() {
  const { size, role, additionals, products } = useLoaderData<Loader>();
  const { get, set } = useSearchParams();
  const [ref, handleScroll] = useScroll();
  const tab = get.tab;
  return (
    <main
      ref={ref}
      onScroll={handleScroll}
      className={cn("flex flex-col gap-5 py-2 px-0.5 flex-1 overflow-auto", sizeClass[size])}
    >
      <Tabs value={tab} onValueChange={(v) => set.tab(v)}>
        <TabsList>
          <TabsTrigger value="product">Produk</TabsTrigger>
          <TabsTrigger value="additional">Biaya Lainnya</TabsTrigger>
        </TabsList>
        <TabsContent value="product">
          <Suspense fallback={<Loading />}>
            <Product products={products} role={role} size={size} />
          </Suspense>
        </TabsContent>
        <TabsContent value="additional">
          <Suspense fallback={<Loading />}>
            <Additional additionals={additionals} role={role} size={size} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Product({
  products: promise,
  role,
  size,
}: {
  products: Promise<Result<"Aplikasi bermasalah", DB.Product[]>>;
  role: DB.Role;
  size: Size;
}) {
  const [errMsg, all] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  const products = useFilterProducts(all);
  return (
    <>
      <PanelProduct size={size} productsLength={products.length} role={role} />
      <ProductList products={products} size={size} />
    </>
  );
}

function Additional({
  additionals: promise,
  role,
  size,
}: {
  additionals: Promise<Result<"Aplikasi bermasalah", DB.AdditionalItem[]>>;
  role: DB.Role;
  size: Size;
}) {
  const [errMsg, all] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  const additionals = useFilterAdditionals(all);
  return (
    <>
      <PanelAdditional size={size} length={additionals.length} role={role} />
      <AdditionalList additionals={additionals} />
    </>
  );
}
