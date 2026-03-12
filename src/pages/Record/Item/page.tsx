import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Receipt } from "./z-Receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Detail } from "./z-Detail";
import { useTab } from "./use-tab";
import { Link, useSearchParams } from "react-router";
import { Data, useData } from "./use-data";
import { getURLBack } from "./utils";
import { useClearTab } from "./use-clear-tab";
import { Result } from "~/lib/result";
import { LoadingBig } from "~/components/Loading";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";

export default function Page({ timestamp, fromTab }: { timestamp: number; fromTab?: number }) {
  useClearTab(fromTab);
  const res = useData(timestamp);
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError(error) {
      switch (error._tag) {
        case "DbError":
          log.error(error.e);
          return <ErrorComponent>{error.e.message}</ErrorComponent>;
        case "NotFound":
          return <NotFound />;
      }
    },
    onSuccess(data) {
      return <Wrapper data={data} />;
    },
  });
}

function Wrapper({ data }: { data: Data }) {
  const [tab, setTab] = useTab();
  const [search] = useSearchParams();
  const urlBack = getURLBack(data.record.timestamp, data.record.mode, search);
  return (
    <main className="flex flex-col gap-2 p-2 overflow-y-auto">
      <Tabs value={tab} onValueChange={(val) => setTab(val)}>
        <div className="flex justify-between items-center gap-2">
          <Button asChild variant="link">
            <Link to={urlBack}>
              <ChevronLeft className="icon" /> Kembali
            </Link>
          </Button>
          <TabsList className="h-fit">
            <TabsTrigger className="text-normal" value="receipt">
              Struk
            </TabsTrigger>
            <TabsTrigger className="text-normal" value="detail">
              Detail
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="receipt">
          <Receipt data={data} />
        </TabsContent>
        <TabsContent value="detail">
          <Detail data={data} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
