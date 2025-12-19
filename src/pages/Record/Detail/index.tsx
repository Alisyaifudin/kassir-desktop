import { Lock, X } from "lucide-react";
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
import { capitalize, cn, formatDate, formatTime } from "~/lib/utils";
import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { Footer } from "./Footer";
import { css } from "../style.css";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { Record } from "../loader";
import { useSize } from "~/hooks/use-size";
import Decimal from "decimal.js";
import { auth } from "~/lib/auth";
import { useSetParams } from "../use-params";

type RecordListProps = {
  extras: RecordExtra[];
  products: RecordProduct[];
  record: Record;
};

// function filterData(
//   timestamp: number | null,
//   allItems: Summary["items"],
//   allAdditionals: Summary["additionals"],
//   records: Summary["record"][]
// ): {
//   items: Summary["items"];
//   additionals: Summary["additionals"];
//   record: Summary["record"] | null;
// } {
//   if (timestamp === null) {
//     return { items: [], record: null, additionals: [] };
//   }
//   const record = records.find((r) => r.timestamp === timestamp);
//   if (record === undefined) {
//     return { items: [], record: null, additionals: [] };
//   }
//   return {
//     items: allItems.filter((item) => item.timestamp === timestamp),
//     record,
//     additionals: allAdditionals.filter((item) => item.timestamp === timestamp),
//   };
// }

export function Detail({ extras, products, record }: RecordListProps) {
  const size = useSize();
  const unselect = useSetParams().unselect;
  return (
    <Show
      when={products.length !== 0 || extras.length !== 0}
      fallback={<DeleteBtn timestamp={record.timestamp} />}
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
              {formatTime(record.timestamp, "long")}, {formatDate(record.timestamp, "long")}
            </p>
            {record.cashier ? <p>Kasir: {capitalize(record.cashier)}</p> : null}
          </div>
        </div>
        <div>
          <Table className="text-normal">
            <TableHeader>
              <TableRow>
                <TableHead className={css.summary[size].small}>No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className={cn("text-end", css.summary[size].big)}>Satuan</TableHead>
                <TableHead className={cn("text-end", css.summary[size].big)}>Modal</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className={cn("text-end", css.summary[size].big)}>SubTotal</TableHead>
                <TableHead className={cn("text-end", css.summary[size].big)}>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="border-b">
              <ForEach items={products}>
                {(item, i) => (
                  <TableRow>
                    <TableCell className="flex items-center">
                      {i + 1}
                      {item.productId === null ? "" : <Lock className="icon" />}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-end">
                      {item.capital.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-center">{item.qty}</TableCell>
                    <TableCell className="text-end">
                      {new Decimal(item.price).times(item.qty).toNumber().toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                )}
              </ForEach>
            </TableBody>
          </Table>
        </div>
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
        <NavBtn timestamp={record.timestamp} />
      </div>
    </Show>
  );
}
function NavBtn({ timestamp }: { timestamp: number }) {
  const { pathname, search } = useLocation();
  const path = encodeURIComponent(`${pathname}${search}`);
  const role = auth.user().role;
  return (
    <div className="pt-20 flex justify-between w-full">
      <Button asChild>
        <Link
          to={{
            pathname: `/records/${timestamp}`,
            search: `?url_back=${path}`,
          }}
        >
          Lihat
        </Link>
      </Button>
      <Show when={role === "admin"}>
        <DeleteBtn timestamp={timestamp} />
      </Show>
    </div>
  );
}
