import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Receipt } from "./Receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Detail } from "./Detail";
import { useTab } from "./use-tab";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { Loader } from "./loader";
import { getURLBack } from "./utils";
import { useClearTab } from "./use-clear-tab";

export default function Page() {
  const { info, data, methods, products, fromTab } = useLoaderData<Loader>();
  useClearTab(fromTab);
  const [tab, setTab] = useTab();
  const [search] = useSearchParams();
  const urlBack = getURLBack(data.record.timestamp, data.record.mode, search);
  return (
    <main className="flex flex-col gap-2 p-2 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Button asChild variant="link" className="self-start">
          <Link to={urlBack}>
            <ChevronLeft className="icon" /> Kembali
          </Link>
        </Button>
      </div>
      <Tabs value={tab} onValueChange={(val) => setTab(val)}>
        <TabsList className="h-fit">
          <TabsTrigger className="text-big" value="receipt">
            Struk
          </TabsTrigger>
          <TabsTrigger className="text-big" value="detail">
            Detail
          </TabsTrigger>
        </TabsList>
        <TabsContent value="receipt">
          <Receipt data={data} info={info} />
        </TabsContent>
        <TabsContent value="detail">
          <Detail products={products} data={data} methods={methods} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
