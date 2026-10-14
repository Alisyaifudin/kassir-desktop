import { Unlock, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { ForEach } from "~/components/ForEach";
import { Loader } from "~/components/Loader";
import { Show } from "~/components/Show";
import { Skeleton } from "~/components/ui/skeleton";
import { capitalize, cn } from "~/lib/utils";
import { formatDate, formatTime } from "~/lib/date";
import { useUser } from "~/hooks/use-user";
import type { RecordFull } from "~/services/record";
import { useUnselect } from "../use-selected";
import { RecordsErrorBoundary, RecordsErrorFallback } from "../z-Error";
import { DeleteBtn } from "./DeleteBtn";
import { ExtrasTable } from "./ExtrasTable";
import { Footer } from "./Footer";
import { ToTransaction } from "./ToTransaction";
import { useRecordFull } from "./use-record-full";

export function Detail({ recordId }: { recordId: string }) {
  const res = useRecordFull(recordId);
  return (
    <RecordsErrorBoundary fallback={RecordsErrorFallback}>
      <Loader res={res} fallback={<Loading />}>
        {({ data: record }) => (record === null ? null : <Body record={record} />)}
      </Loader>
    </RecordsErrorBoundary>
  );
}

function Body({ record }: { record: RecordFull }) {
  const unselect = useUnselect();
  return (
    <Show
      when={record.listings.length !== 0 || record.extras.length !== 0}
      fallback={<DeleteBtn recordId={record.id} />}
    >
      <div className="flex flex-col gap-2 overflow-hidden h-full">
        <div className="flex items-center gap-2 justify-between shrink-0 py-1">
          <div className="flex items-center gap-1">
            <button onClick={unselect} className="hover:bg-primary-foreground">
              <X />
            </button>
            <p>No: {record.id}</p>
          </div>
          <div className="flex items-center gap-5">
            <p>
              {formatTime(record.paidAt, "long")}, {formatDate(record.paidAt, "long")}
            </p>
            {record.cashier ? <p>Kasir: {capitalize(record.cashier)}</p> : null}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
          <Show when={record.listings.length > 0}>
            <div className="shrink-0">
              <Table className="text-normal">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[57px] small:w-[41px]">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className={cn("text-end w-[160px] small:w-[100px]")}>
                      Satuan
                    </TableHead>
                    <TableHead className="w-[57px] small:w-[41px]">Qty</TableHead>
                    <TableHead className={cn("text-end  w-[160px] small:w-[100px]")}>
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="border-b">
                  <ForEach items={record.listings}>
                    {(item, i) => (
                      <TableRow>
                        <TableCell className="flex items-center">
                          {i + 1}
                          {item.listingId !== null ? <Unlock className="icon" /> : null}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-end">
                          {item.price.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-center">{item.qty}</TableCell>
                        <TableCell className="text-end">
                          {item.total.toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    )}
                  </ForEach>
                </TableBody>
              </Table>
            </div>
          </Show>
          <Show when={record.extras.length > 0}>
            <div className="shrink-0">
              <ExtrasTable record={record} />
            </div>
          </Show>
          <Footer record={record} />
          <Show when={record.customer.name !== "" && record.customer.phone !== ""}>
            <p className="shrink-0">
              Pelanggan: {record.customer.name} ({record.customer.phone})
            </p>
          </Show>
          <Show when={record.note !== ""}>
            <div className="shrink-0">
              <p>Catatan:</p>
              <p>{record.note}</p>
            </div>
          </Show>
        </div>
        <div className="shrink-0 pt-2 border-t mt-auto">
          <FooterBtn record={record} />
        </div>
      </div>
    </Show>
  );
}

function FooterBtn({ record }: { record: RecordFull }) {
  const { pathname, search } = useLocation();
  const path = encodeURIComponent(`${pathname}${search}`);
  const role = useUser().role;
  return (
    <div className="pt-20 flex justify-between w-full">
      <Button asChild>
        <Link to={{ pathname: `/records/${record.id}`, search: `?url_back=${path}` }}>Lihat</Link>
      </Button>
      <div className="flex items-center gap-3">
        <ToTransaction />
        <Show when={role === "admin"}>
          <DeleteBtn recordId={record.id} />
        </Show>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
