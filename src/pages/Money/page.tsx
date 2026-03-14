import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useInterval } from "./use-interval";
import { TableList } from "./z-TableList";
import { NewItem } from "./z-NewItem";
import { TableListDebt } from "./z-TableListDebt";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export default function Page() {
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
        <Wrapper />
      </Tabs>
    </main>
  );
}

export function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(money) {
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
    },
  });
}

function Loading() {
  return (
    <>
      <TabsContent value="saving" className="overflow-hidden flex-1 w-full">
        <LoadingTable cols={7} />
      </TabsContent>
      <TabsContent value="debt" className="overflow-hidden flex-1 w-full">
        <LoadingTable cols={8} />
      </TabsContent>
      <TabsContent value="diff" className="overflow-hidden flex-1 w-full">
        <LoadingTable cols={7} />
      </TabsContent>
    </>
  );
}

function LoadingTable({ cols }: { cols: number }) {
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-24" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 12 }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: cols }).map((_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
