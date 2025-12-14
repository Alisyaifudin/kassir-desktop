import { Link, useLoaderData, useSearchParams } from "react-router";
import { cn, getBackURL, sizeClass } from "~/lib/utils";
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
import { Size } from "~/lib/store-old";
import { css } from "./style.css";

export default function Page() {
  const { histories, images, product, size, role, id } = useLoaderData<Loader>();
  const [search] = useSearchParams();
  const backURL = getBackURL("/stock", search);
  return (
    <main
      className={cn(
        "py-2 px-5 mx-auto w-full h-full flex flex-col gap-2 overflow-hidden",
        css.nav[size],
        sizeClass[size],
      )}
    >
      <Button asChild variant="link" className="self-start">
        <Link to={backURL}>
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <div className="grid grid-cols-2 gap-2 flex-1  overflow-hidden">
        <div className="h-full overflow-hidden">
          <Detail product={product} role={role} size={size} />
        </div>
        <SideTab role={role} histories={histories} id={id} images={images} />
      </div>
    </main>
  );
}

function Detail({ product, role, size }: { product: DB.Product; role: DB.Role; size: Size }) {
  switch (role) {
    case "admin":
      return <ProductForm product={product} size={size} />;
    case "user":
      return <Info product={product} />;
  }
}

function SideTab({
  histories,
  images,
  id,
  role,
}: {
  histories: HistoryPromise;
  images: ImagePromise;
  id: number;
  role: DB.Role;
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
      <TabsContent value="history" className="flex-1 overflow-hidden">
        <Suspense fallback={<Loading />}>
          <History histories={histories} id={id} />
        </Suspense>
      </TabsContent>
      <TabsContent value="image" id="image-container" className="flex-1 flex overflow-hidden">
        <Suspense fallback={<Loading />}>
          <ImageSection images={images} role={role} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
