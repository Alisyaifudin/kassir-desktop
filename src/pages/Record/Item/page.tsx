import { Receipt } from "./z-Receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Detail } from "./z-Detail";
import { useTab } from "./use-tab";
import { RecordData, useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page({ timestamp }: { timestamp: number }) {
  const res = useData(timestamp);
  return Result.match(res, {
    onLoading() {
      return <Loading />;
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

function Loading() {
  return (
    <main className="flex flex-col gap-2 p-2 overflow-y-auto">
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
        <Skeleton className="h-12 w-full" />
        <div className="border pt-5">
          <div className="flex flex-col gap-2 px-2 pb-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    </main>
  );
}

function Wrapper({ data }: { data: RecordData }) {
  const [tab, setTab] = useTab();
  // const [search] = useSearchParams();
  // const urlBack = getURLBack(data.record.timestamp, data.record.mode, search);
  return (
    <main className="flex flex-col gap-2 p-2 overflow-y-auto">
      <Tabs value={tab} onValueChange={(val) => setTab(val)}>
        <div className="flex justify-between items-center gap-2">
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
