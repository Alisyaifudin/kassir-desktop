import { useLoaderData, useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useInterval } from "./use-interval";
import { TableList } from "./z-TableList";
import { Loader, MoneyData } from "./loader";
import { NewItem } from "./z-NewItem";
import { TableListDebt } from "./z-TableListDebt";
import { Suspense, use } from "react";
import { Result } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { LoadingBig } from "~/components/Loading";

export default function Page() {
  const money = useLoaderData<Loader>();
  const [search, setSearch] = useSearchParams();
  const { time, kind, date } = useInterval(search);
  const setTime = (time: number) => {
    setSearch({ time: time.toString(), kind });
  };
  const handleNext = () => {
    const time = date.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds;
    setSearch({ time: time.toString(), kind });
  };
  const handlePrev = () => {
    const time = date.subtract(Temporal.Duration.from({ months: 1 })).epochMilliseconds;
    setSearch({ time: time.toString(), kind });
  };
  const setChangeMode = (mode: string) => {
    const kind = z.enum(["saving", "debt", "diff"]).catch("saving").parse(mode);
    setSearch({
      kind,
      time: time.toString(),
    });
  };
  return (
    <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
      <h1 className="text-big font-bold">Catatan Keuangan</h1>
      <Tabs
        value={kind}
        onValueChange={setChangeMode}
        className="overflow-hidden items-center flex py-1 flex-col gap-1 flex-1"
      >
        <div className="grid grid-cols-3 px-2 items-center w-full">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="p-1" onClick={handlePrev}>
              <ChevronLeft className="icon" />
            </Button>
            <Calendar mode="month" time={time} setTime={setTime} />
            <Button variant="outline" className="p-1" onClick={handleNext}>
              <ChevronRight className="icon" />
            </Button>
          </div>
          <TabsList className="text-normal w-fit h-fit">
            <TabsTrigger value="saving">Simpanan</TabsTrigger>
            <TabsTrigger value="debt">Utang</TabsTrigger>
            <TabsTrigger value="diff">Selisih</TabsTrigger>
          </TabsList>
          <div className="flex justify-end">
            <NewItem key={kind} kind={kind} />
          </div>
        </div>
        <Suspense fallback={<LoadingBig />}>
          <Content money={money} />
        </Suspense>
      </Tabs>
    </main>
  );
}

function Content({ money: promise }: { money: Promise<Result<"Aplikasi bermasalah", MoneyData>> }) {
  const [errMsg, money] = use(promise);
  if (errMsg !== null) return <TextError>{errMsg}</TextError>;
  return (
    <>
      <TabsContent value="saving" className="overflow-hidden flex-1 w-full">
        <TableList money={money.saving} />
      </TabsContent>
      <TabsContent value="debt" className="overflow-hidden flex-1 w-full">
        <TableListDebt money={money.debt} />
      </TabsContent>
      <TabsContent value="diff" className="overflow-hidden flex-1 w-full">
        <TableList money={money.diff} />
      </TabsContent>
    </>
  );
}
