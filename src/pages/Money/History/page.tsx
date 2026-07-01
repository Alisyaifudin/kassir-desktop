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
import { NotFound } from "~/components/NotFound";
import { Money, MoneyKind } from "~/database/money/get-by-range";
import { Header } from "./z-Header";
import { TableList } from "./z-TableList";
import { DeletePocketBtn } from "./z-DeletePocket";
import { Download } from "./z-Download";
import { UploadMoney } from "./z-UploadDialog";

export default function Page({ kindId }: { kindId: string }) {
  const res = useData(kindId);
  return Result.match(res, {
    onLoading() {
      return <Loading cols={7} />;
    },
    onError(e) {
      switch (e._tag) {
        case "DbError":
          log.error(e.e);
          return <ErrorComponent>{e.e.message}</ErrorComponent>;
        case "NotFound":
          return <NotFound />;
      }
    },
    onSuccess({ money, kind }) {
      return <Wrapper money={money} kind={kind} />;
    },
  });
}

function Wrapper({ kind, money }: { kind: MoneyKind; money: Money[] }) {
  return (
    <main className="flex flex-col gap-2 w-full p-0.5 mx-auto flex-1 overflow-hidden">
      <Header kind={kind} />
      <TableList money={money} type={kind.type} />
      <div className="flex items-center pb-1 justify-between">
        <DeletePocketBtn kindId={kind.id} />
        <div className="flex items-center gap-2">
          <UploadMoney kindId={kind.id} />
          <Download kind={kind.name} kindId={kind.id} />
        </div>
      </div>
    </main>
  );
}

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
