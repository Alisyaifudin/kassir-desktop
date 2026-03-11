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
import { Data } from "../use-records";
import { ToTransaction } from "./ToTransaction";
import { useUnselect } from "../use-selected";
import { useUser } from "~/hooks/use-user";
import { formatDate, formatTime } from "~/lib/date";

export function Detail({ extras, products, record }: Data) {
  const unselect = useUnselect();
  return (
    <Show
      when={products.length !== 0 || extras.length !== 0}
      fallback={<DeleteBtn mode={record.mode} products={products} timestamp={record.timestamp} />}
    >
      <div className="flex flex-col gap-2 overflow-auto">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1">
            <button onClick={unselect} className="hover:bg-primary-foreground">
              <X />
            </button>
            <p>No: {record.timestamp}</p>
          </div>
          <div className="flex items-center gap-5">
            <p>
              {formatTime(record.paidAt, "long")}, {formatDate(record.paidAt, "long")}
            </p>
            {record.cashier ? <p>Kasir: {capitalize(record.cashier)}</p> : null}
          </div>
        </div>
        <Show when={products.length > 0}>
          <div>
            <Table className="text-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[57px] small:w-[41px]">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className={cn("text-end w-[160px] small:w-[100px]")}>Satuan</TableHead>
                  <TableHead className="w-[57px] small:w-[41px]">Qty</TableHead>
                  <TableHead className={cn("text-end  w-[160px] small:w-[100px]")}>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="border-b">
                <ForEach items={products}>
                  {(item, i) => (
                    <TableRow>
                      <TableCell className="flex items-center">
                        {i + 1}
                        {item.productId === undefined ? <Unlock className="icon" /> : null}
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
          <p>
            Pelanggan: {record.customer.name} ({record.customer.phone})
          </p>
        </Show>
        <Show when={record.note !== ""}>
          <div>
            <p>Catatan:</p>
            <p>{record.note}</p>
          </div>
        </Show>
        <FooterBtn data={{ extras, products, record }} />
      </div>
    </Show>
  );
}
function FooterBtn({ data }: { data: Data }) {
  const { pathname, search } = useLocation();
  const path = encodeURIComponent(`${pathname}${search}`);
  const role = useUser().role;
  return (
    <div className="pt-20 flex justify-between w-full">
      <Button asChild>
        <Link
          to={{
            pathname: `/records/${data.record.timestamp}`,
            search: `?url_back=${path}`,
          }}
        >
          Lihat
        </Link>
      </Button>
      <div className="flex items-center gap-3">
        <ToTransaction data={data} />
        <Show when={role === "admin"}>
          <DeleteBtn
            timestamp={data.record.timestamp}
            mode={data.record.mode}
            products={data.products}
          />
        </Show>
      </div>
    </div>
  );
}
