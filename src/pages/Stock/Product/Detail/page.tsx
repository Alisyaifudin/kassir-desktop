import { useLoaderData } from "react-router";
import { Suspense } from "react";
import { History } from "./History";
import { Loader } from "./loader";
import { ProductForm } from "./ProductForm";
import { Info } from "./Info";
import { LoadingBig } from "~/components/Loading";
import { Product } from "~/database/product/get-by-id";
import { auth } from "~/lib/auth";

export default function Page() {
  const { histories, product, id } = useLoaderData<Loader>();
  return (
    <div className="grid grid-cols-2 gap-2 flex-1  overflow-hidden">
      <div className="h-full overflow-hidden">
        <Detail product={product} />
      </div>
      <Suspense fallback={<LoadingBig />}>
        <History histories={histories} id={id} />
      </Suspense>
    </div>
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

// function SideTab({
//   histories,
//   images,
//   id,
// }: {
//   histories: HistoryPromise;
//   images: ImagePromise;
//   id: number;
// }) {
//   const [tab, setTab] = useTab();
//   return (
//     <Tabs value={tab} onValueChange={setTab} className="overflow-hidden flex flex-col flex-1">
//       <TabsList className="self-start">
//         <TabsTrigger value="history" className="text-normal">
//           Transaksi
//         </TabsTrigger>
//         <TabsTrigger value="image" className="text-normal">
//           Gambar
//         </TabsTrigger>
//       </TabsList>
//       <TabsContent value="history" className="flex-1 max-h-full overflow-hidden">
//         <Suspense fallback={<Loading />}>
//           <History histories={histories} id={id} />
//         </Suspense>
//       </TabsContent>
//       <TabsContent value="image" id="image-container" className="flex-1 flex overflow-hidden">
//         <Suspense fallback={<Loading />}>
//           <ImageSection images={images} />
//         </Suspense>
//       </TabsContent>
//     </Tabs>
//   );
// }
