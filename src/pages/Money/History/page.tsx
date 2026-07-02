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
import { tableList } from "./z-TableList";
import { deletePocket } from "./effect-deletePocket";
import { download } from "./effect-download";
import { uploadMoney } from "./effect-uploadMoney";
import { Effect } from "effect";
import { MoneyService } from "~/services/money";
import { StateWrap } from "~/components/StateWrap";
import { TimePicker } from "./z-TimePicker";
import { useRange } from "./use-range";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { useMemo } from "react";
import { header } from "./z-Header";

const page = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const loader = (pocketId: string, start: number, end: number) => () =>
    moneyService.money.loader(pocketId, start, end);
  const TableList = yield* tableList;
  const Header = yield* header;
  const DeletePocketBtn = yield* deletePocket;
  const Download = yield* download;
  const UploadMoney = yield* uploadMoney;
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
          loading={<Loading cols={7} />}
          error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
        >
          <div className="flex items-center justify-between py-1 pr-1">
            <Header />
            <TimePicker range={range} setRange={setRange} />
          </div>
          <TableList start={start} end={end} />
          <div className="flex items-center pb-1 justify-between">
            <DeletePocketBtn pocketId={pocketId} />
            <div className="flex items-center gap-2">
              <UploadMoney pocketId={pocketId} />
              <Download pocketId={pocketId} />
            </div>
          </div>
        </StateWrap>
      </main>
    );
  };
});

function Loading({ cols }: { cols: number }) {
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
