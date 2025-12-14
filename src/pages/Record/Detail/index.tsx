import { Lock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Link, useLocation, useSearchParams } from "react-router";
import { DeleteBtn } from "./DeleteBtn";
import { Button } from "~/components/ui/button";
import { capitalize, cn, formatDate, formatTime } from "~/lib/utils";
import { Summary } from "~/lib/record";
import { Show } from "~/components/Show";
import { DEFAULT_METHOD } from "~/lib/constants";
import { ForEach } from "~/components/ForEach";
import { Footer } from "./Footer";
import { Size } from "~/lib/store-old";
import { css } from "../style.css";
import { getParam } from "../utils/params";

type RecordListProps = {
  allItems: Summary["items"];
  records: Summary["record"][];
  allAdditionals: Summary["additionals"];
  methods: DB.Method[];
  size: Size;
  role: DB.Role;
};

function filterData(
  timestamp: number | null,
  allItems: Summary["items"],
  allAdditionals: Summary["additionals"],
  records: Summary["record"][],
): {
  items: Summary["items"];
  additionals: Summary["additionals"];
  record: Summary["record"] | null;
} {
  if (timestamp === null) {
    return { items: [], record: null, additionals: [] };
  }
  const record = records.find((r) => r.timestamp === timestamp);
  if (record === undefined) {
    return { items: [], record: null, additionals: [] };
  }
  return {
    items: allItems.filter((item) => item.timestamp === timestamp),
    record,
    additionals: allAdditionals.filter((item) => item.timestamp === timestamp),
  };
}

export function Detail({
  allItems,
  records,
  allAdditionals: allTaxes,
  methods,
  size,
  role,
}: RecordListProps) {
  const [search] = useSearchParams();
  const timestamp = getParam(search).selected;
  const { items, record, additionals } = filterData(timestamp, allItems, allTaxes, records);
  if (record === null) {
    return null;
  }
  return (
    <List
      size={size}
      role={role}
      items={items}
      record={record}
      additionals={additionals}
      methods={methods}
    />
  );
}

function List({
  items,
  record,
  additionals,
  methods,
  size,
  role,
}: {
  items: Summary["items"];
  record: Summary["record"];
  additionals: Summary["additionals"];
  methods: DB.Method[];
  size: Size;
  role: DB.Role;
}) {
  const { pathname, search } = useLocation();
  const path = encodeURIComponent(`${pathname}${search}`);
  const method = methods.find((m) => m.id === record.method_id) ?? DEFAULT_METHOD;
  return (
    <Show
      when={items.length !== 0 || additionals.length !== 0}
      fallback={<DeleteBtn size={size} timestamp={record.timestamp} />}
    >
      <div className="flex flex-col gap-2 overflow-auto">
        <div className="flex items-center gap-2 justify-between">
          <p>No: {record.timestamp}</p>
          <div className="flex items-center gap-5">
            <p>
              {formatTime(record.timestamp, "long")}, {formatDate(record.timestamp, "long")}
            </p>
            {record.cashier ? <p>Kasir: {capitalize(record.cashier)}</p> : null}
          </div>
        </div>
        <Table className="text-normal">
          <TableHeader>
            <TableRow>
              <TableHead className={css.summary[size].small}>No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className={cn("text-end", css.summary[size].big)}>Satuan</TableHead>
              <TableHead className={cn("text-end", css.summary[size].big)}>Modal</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className={cn("text-end", css.summary[size].big)}>Total*</TableHead>
              <TableHead className={cn("text-end", css.summary[size].big)}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="border-b">
            <ForEach items={items}>
              {(item, i) => (
                <TableRow>
                  <TableCell className="flex items-center">
                    {i + 1}
                    {item.product_id === null ? "" : <Lock className="icon" />}
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-center">{item.qty}</TableCell>
                  <TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-end">
                    {item.grandTotal.toLocaleString("id-ID")}
                  </TableCell>
                </TableRow>
              )}
            </ForEach>
          </TableBody>
        </Table>
        <Footer size={size} additionals={additionals} method={method} record={record} />
        <Show when={record.customer_phone !== "" && record.customer_name !== ""}>
          <p>
            Pelanggan: {record.customer_name} ({record.customer_phone})
          </p>
        </Show>
        <Show when={record.note !== ""}>
          <div>
            <p>Catatan:</p>
            <p>{record.note}</p>
          </div>
        </Show>
        <NavBtn size={size} path={path} role={role} timestamp={record.timestamp} />
      </div>
    </Show>
  );
}

function NavBtn({
  timestamp,
  path,
  role,
  size,
}: {
  path: string;
  size: Size;
  timestamp: number;
  role: DB.Role;
}) {
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
        <DeleteBtn timestamp={timestamp} size={size} />
      </Show>
    </div>
  );
}
