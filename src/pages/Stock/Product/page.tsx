import { Link, useLoaderData, useSearchParams } from "react-router";
import { cn, getBackURL } from "~/lib/utils";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { History } from "./History";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { HistoryPromise, Loader } from "./loader";
import { ProductForm } from "./ProductForm";
import { Info } from "./Info";
import { ImagePromise } from "./utils";
import { ImageSection } from "./ImageSection";
import { useTab } from "./use-tab";
import { Loading } from "~/components/Loading";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { Product } from "~/database/product/get-by-id";
import { auth } from "~/lib/auth";

export default function Page() {
  const { histories, images, product, id } = useLoaderData<Loader>();
  const [search] = useSearchParams();
  const size = useSize();
  const backURL = getBackURL("/stock", search);
  return (
    <main
      className={cn(
        "py-2 px-5 mx-auto w-full h-full flex flex-col gap-2 overflow-hidden",
        css.nav[size]
      )}
    >
      <Button asChild variant="link" className="self-start">
        <Link to={backURL}>
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <div className="grid grid-cols-2 gap-2 flex-1  overflow-hidden">
        <div className="h-full overflow-hidden">
          <Detail product={product} />
        </div>
        <SideTab histories={histories} id={id} images={images} />
      </div>
    </main>
  );
}

function Detail({ product }: { product: Product }) {
  const role = auth.user().role;
  switch (role) {
    case "admin":
      return <ProductForm product={product} />;
    case "user":
      return <Info product={product} />;
  }
}

function SideTab({
  histories,
  images,
  id,
}: {
  histories: HistoryPromise;
  images: ImagePromise;
  id: number;
}) {
  const [tab, setTab] = useTab();
  return (
    <Tabs value={tab} onValueChange={setTab} className="overflow-hidden flex flex-col flex-1">
      <TabsList className="self-start">
        <TabsTrigger value="history" className="text-normal">
          Transaksi
        </TabsTrigger>
        <TabsTrigger value="image" className="text-normal">
          Gambar
        </TabsTrigger>
      </TabsList>
      <TabsContent value="history" className="flex-1 max-h-full overflow-hidden">
        <Suspense fallback={<Loading />}>
          <History histories={histories} id={id} />
        </Suspense>
      </TabsContent>
      <TabsContent value="image" id="image-container" className="flex-1 flex overflow-hidden">
        <Suspense fallback={<Loading />}>
          <ImageSection images={images} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
