import { cn } from "~/lib/utils";
import type { Record as RecordModel } from "~/services/record";
import { Loader } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Header } from "./z-Header";
import { Records } from "./z-Record";
import { Detail } from "./z-Detail";
import { useRecords } from "./use-records";
import { useSelected } from "./use-selected";
import { RecordsErrorBoundary, RecordsErrorFallback } from "./z-Error";

export default function Page() {
  return (
    <main className="flex flex-col gap-2 p-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <Header />
      <div className="flex-1 min-h-0">
        <List />
      </div>
    </main>
  );
}

function List() {
  const res = useRecords();
  return (
    <RecordsErrorBoundary fallback={RecordsErrorFallback}>
      <Loader res={res} fallback={<Loading />}>
        {({ data: records }) => <Workspace records={records} />}
      </Loader>
    </RecordsErrorBoundary>
  );
}

function Workspace({ records }: { records: RecordModel[] }) {
  const [selected] = useSelected();
  return (
    <div
      className={cn(
        "grid gap-2 h-full overflow-hidden grid-cols-[490px_1px_1fr] small:grid-cols-[335px_1px_1fr]",
      )}
    >
      <div className="h-full overflow-hidden">
        <Records records={records} />
      </div>
      <div className="border-l h-full" />
      <div className="h-full overflow-hidden">
        {selected === null ? null : <Detail recordId={selected} />}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div
      className={cn(
        "grid gap-2 h-full overflow-hidden grid-cols-[490px_1px_1fr] small:grid-cols-[335px_1px_1fr]",
      )}
    >
      <div className="h-full overflow-hidden">
        <div className="flex flex-col gap-1 overflow-hidden h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Table className="text-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px] small:w-[10px]">No</TableHead>
                  <TableHead className="text-center w-[150px] small:w-[90px]">Kasir</TableHead>
                  <TableHead className="w-[120px] small:w-[93px]">Waktu</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-6" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center gap-2 shrink-0 py-2 border-t mt-auto">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="border-l h-full" />
      <div className="h-full overflow-hidden">
        <div className="flex flex-col gap-2 p-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
