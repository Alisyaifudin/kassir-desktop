import { Unlock, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Link, useLocation } from "react-router";
import { DeleteBtn } from "./DeleteBtn";
import { Button } from "~/components/ui/button";
import { capitalize, cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { Footer } from "./Footer";
import { DataRecord } from "../use-records";
import { ToTransaction } from "./ToTransaction";
import { useUnselect } from "../use-selected";
import { useUser } from "~/hooks/use-user";
import { formatDate, formatTime } from "~/lib/date";

export function Detail({ extras, products, record }: DataRecord) {
  const unselect = useUnselect();
  return (
    <Show
      when={products.length !== 0 || extras.length !== 0}
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
          <Show when={products.length > 0}>
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
                  <ForEach items={products}>
                    {(item, i) => (
                      <TableRow>
                        <TableCell className="flex items-center">
                          {i + 1}
                          {item.productId !== undefined ? <Unlock className="icon" /> : null}
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
          <Footer extras={extras} record={record} />
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
          <FooterBtn data={{ extras, products, record }} />
        </div>
      </div>
    </Show>
  );
}
function FooterBtn({ data }: { data: DataRecord }) {
  const { pathname, search } = useLocation();
  const path = encodeURIComponent(`${pathname}${search}`);
  const role = useUser().role;
  return (
    <div className="pt-20 flex justify-between w-full">
      <Button asChild>
        <Link
          to={{
            pathname: `/records/${data.record.id}`,
            search: `?url_back=${path}`,
          }}
        >
          Lihat
        </Link>
      </Button>
      <div className="flex items-center gap-3">
        <ToTransaction data={data} />
        <Show when={role === "admin"}>
          <DeleteBtn recordId={data.record.id} />
        </Show>
      </div>
    </div>
  );
}
