import { ErrorComponent } from "~/components/ErrorComponent";
import { Effect } from "effect";
import { MoneyService } from "~/services/money";
import { PocketService } from "~/services/pocket";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";
import { StateWrap } from "~/components/StateWrap";
import { TableList } from "./z-TableList";
import { Header } from "./z-Header";
import { DeletePocket } from "./z-DeletePocket";
import { Download } from "./z-Download";
import { SonnerService } from "~/services/sonner";
import { UploadMoney } from "./z-UploadMoney";
import { NewRecord } from "./z-NewRecord";
import { TimePicker } from "./z-TimePicker";
import { useRange } from "./use-range";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { useMemo } from "react";
import { promisify } from "~/lib/promisify";
import { downloadEffect } from "./effect-download-program";
import type { MoneyImport } from "~/services/money/type";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const page = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const pocketService = yield* PocketService;
  const ioService = yield* IoService;
  const blobService = yield* BlobService;
  const sonner = yield* SonnerService;

  // --- Callbacks ---
  const onDeleteRecord = (id: string) =>
    promisify(
      () => moneyService.delete(id),
      (e) => e.e.message,
    );
  const onDeletePocket = (pocketId: string) =>
    promisify(
      () => pocketService.delete(pocketId),
      (e) => e.e.message,
    );
  const onAddRecord = (args: {
    pocketId: string;
    value: number;
    type: DBNamespace.PocketType;
    note: string;
  }) =>
    promisify(
      () => moneyService.add.local(args),
      (e) => e.e.message,
    );
  const onUpdateName = (pocketId: string, name: string) =>
    promisify(
      () => pocketService.set.name(pocketId, name),
      (e) => e.e.message,
    );
  const onAddExternal = (pocketId: string, record: MoneyImport) =>
    promisify(
      () => moneyService.add.external(pocketId, record),
      (e) => e.e.message,
    );
  const onDownload = (pocketId: string, name: string) =>
    promisify(
      () =>
        downloadEffect(pocketId, name).pipe(
          Effect.provideService(MoneyService, moneyService),
          Effect.provideService(IoService, ioService),
          Effect.provideService(BlobService, blobService),
        ),
      (e) => e, // catchAll already returns string
    );

  const loader = (pocketId: string, start: number, end: number) => () =>
    moneyService.loader(pocketId, start, end);
  const usePocket = () => moneyService.usePocket();

  return function Page({ pocketId }: { pocketId: string }) {
    const [range, setRange] = useRange();
    const range0 = range[0];
    const range1 = range[1];
    const start = useMemo(
      () => range0.toZonedDateTime(tz).startOfDay().epochMilliseconds,
      [range0],
    );
    const end = useMemo(
      () =>
        range1
          .add(Temporal.Duration.from({ days: 1 }))
          .toZonedDateTime(tz)
          .startOfDay().epochMilliseconds,
      [range1],
    );

    return (
      <main className="flex flex-col gap-2 w-full p-0.5 mx-auto flex-1 overflow-hidden">
        <StateWrap
          loader={loader(pocketId, start, end)}
          loading={<Loading />}
          error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
        >
          <Header
            usePocket={usePocket}
            NewRecordSlot={<NewRecord usePocket={usePocket} onAdd={onAddRecord} />}
            sonner={sonner}
            onUpdateName={onUpdateName}
          />
          <div className="flex items-center justify-between py-1 pr-1">
            <TimePicker range={range} setRange={setRange} />
          </div>
          <TableList
            useMoney={(s, e) => moneyService.useMoney(s, e)}
            usePocket={usePocket}
            onDeleteRecord={onDeleteRecord}
            start={start}
            end={end}
          />
          <div className="flex items-center pb-1 justify-between">
            <DeletePocket pocketId={pocketId} onDelete={onDeletePocket} />
            <div className="flex items-center gap-2">
              <UploadMoney pocketId={pocketId} onAddExternal={onAddExternal} />
              <Download
                pocketId={pocketId}
                usePocket={() => moneyService.usePocket()}
                sonner={sonner}
                onDownload={onDownload}
              />
            </div>
          </div>
        </StateWrap>
      </main>
    );
  };
});

function Loading() {
  const cols = 7;
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

export default page;
