import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTab } from "./use-tab";
import { Layout } from "./z-Layout";
import { ExtraEntries } from "./Extra";
import { ProductEntries } from "./Product";

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
          <ProductEntries />
        </TabsContent>
        <TabsContent value="extra" className="overflow-hidden px-0.5 flex-1 w-full flex flex-col">
          <ExtraEntries />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
