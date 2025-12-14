import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { memo, Suspense } from "react";
import { GotoProductBtn } from "./GotoProductBtn";
import { Header } from "./Header";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { EditDialog } from "./EditDialog";
import { Summary } from "./Summary";
import { LinkProductList } from "./LinkProduct";
import { formatDate, formatTime, getDayName, METHOD_NAMES, Result } from "~/lib/utils";
import { Size } from "~/lib/store-old";
import { Summary as SummaryType } from "~/lib/record";
import { DebtDialog } from "./DebtDialog";

const localStyle = {
  big: {
    small: {
      width: "70px",
    },
    big: {
      width: "170px",
    },
  },
  small: {
    small: {
      width: "40px",
    },
    big: {
      width: "100px",
    },
  },
};

export const Detail = memo(function ({
  data: { additionals, items, record },
  methods,
  role,
  showCashier,
  size,
  method,
  products,
}: {
  data: SummaryType;
  methods: DB.Method[];
  role: DB.Role;
  showCashier: boolean;
  method: DB.Method;
  size: Size;
  products: Promise<Result<"Aplikasi bermasalah", DB.Product[]>>;
}) {
  const customer = { name: record.customer_name, phone: record.customer_phone };
  return (
    <div className="flex flex-col gap-2 text-3xl">
      <Header
        size={size}
        showCashier={showCashier}
        cashier={record.cashier}
        mode={record.mode}
        timestamp={record.timestamp}
        role={role}
      />
      <Show when={record.credit === 1 && role === "admin"}>
        <DebtDialog size={size} grandTotal={record.grandTotal} />
      </Show>
      <Table className="text-normal">
        <TableHeader>
          <TableRow>
            <TableHead style={localStyle[size].small}>No</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead style={localStyle[size].big} className="text-end">
              Satuan
            </TableHead>
            <TableHead style={localStyle[size].big} className="text-end">
              Modal
            </TableHead>
            <TableHead style={localStyle[size].small}>Qty</TableHead>
            <TableHead style={localStyle[size].big} className="text-end">
              Total*
            </TableHead>
            <TableHead style={localStyle[size].big} className="text-end">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="border-b">
          <ForEach items={items}>
            {(item, i) => (
              <>
                <TableRow>
                  <TableCell className="flex items-center">
                    {i + 1}
                    <Show when={role === "admin"}>
                      <Suspense>
                        <LinkProductList size={size} products={products} item={item} />
                      </Suspense>
                    </Show>
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-end flex items-center gap-1 justify-end">
                    <GotoProductBtn productId={item.product_id} />
                    {item.price.toLocaleString("id-ID")}{" "}
                  </TableCell>
                  <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-center">{item.qty}</TableCell>
                  <TableCell className="text-end">{item.total.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-end">
                    {item.grandTotal.toLocaleString("id-ID")}
                  </TableCell>
                </TableRow>
                <ForEach items={item.discs}>
                  {(disc) => (
                    <TableRow>
                      <TableCell colSpan={5} className="text-end">
                        Diskon {disc.kind === "percent" ? `${disc.value}%` : null}
                      </TableCell>
                      <TableCell className="text-end">
                        {disc.effVal.toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  )}
                </ForEach>
              </>
            )}
          </ForEach>
        </TableBody>
      </Table>
      <Summary
        additionals={additionals}
        change={record.change}
        discVal={record.disc_val}
        grandTotal={record.grandTotal}
        pay={record.pay}
        rounding={record.rounding}
        totalAfterAdditional={record.totalAfterAdditional}
        totalAfterDiscount={record.totalAfterDiscount}
        totalDiscount={record.totalDiscount}
        totalFromItems={record.totalFromItems}
      />
      <Show when={customer.name !== "" && customer.phone !== ""}>
        <p>
          Pelanggan: {customer.name} ({customer.phone})
        </p>
      </Show>
      <EditDialog
        size={size}
        isCredit={record.credit === 1}
        mode={record.mode}
        note={record.note}
        method={method}
        methods={methods}
      />
      <div className="flex flex-col gap-2">
        <p>
          Dibayar: {formatTime(record.paid_at, "long")} | {getDayName(record.paid_at)},{" "}
          {formatDate(record.paid_at, "long")}
        </p>
        <p>
          Metode: {METHOD_NAMES[method.method]} {method.name}
        </p>
        <p>{record.note}</p>
      </div>
    </div>
  );
});
