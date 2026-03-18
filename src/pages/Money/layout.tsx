import { Outlet } from "react-router";
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
import { TimePicker } from "./z-TimePicker";
import { NewPocket } from "./z-NewPocket";

export default function Page() {
  return (
    <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
      <div className="flex items-center justify-between p-0.5">
        <h1 className="text-big font-bold">Catatan Keuangan</h1>
        <TimePicker />
        <NewPocket />
      </div>
      <Wrapper />
    </main>
  );
}

export function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading cols={7} />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(money) {
      return <Outlet context={{ money }} />;
    },
  });
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
