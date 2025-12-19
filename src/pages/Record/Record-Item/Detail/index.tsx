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
import {
  DefaultError,
  formatDate,
  formatTime,
  getDayName,
  METHOD_NAMES,
  Result,
} from "~/lib/utils";
import { DebtDialog } from "./DebtDialog";
import { Data } from "../loader";
import { Method } from "~/database/method/get-all";
import { Product } from "~/database/product/caches";
import { auth } from "~/lib/auth";
import { useSize } from "~/hooks/use-size";
import Decimal from "decimal.js";

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
  data,
  methods,
  products,
}: {
  data: Data;
  methods: Promise<Result<DefaultError, Method[]>>;
  products: Promise<Result<"Aplikasi bermasalah", Product[]>>;
}) {
  const role = auth.user().role;
  const size = useSize();
  return (
    <div className="flex flex-col gap-2 text-3xl">
      <Header
        cashier={data.record.cashier}
        mode={data.record.mode}
        timestamp={data.record.timestamp}
      />
      <Show when={data.record.isCredit && role === "admin"}>
        <DebtDialog grandTotal={data.record.grandTotal} />
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
          <ForEach items={data.products}>
            {(product, i) => (
              <>
                <TableRow>
                  <TableCell className="flex items-center">
                    {i + 1}
                    <Show when={role === "admin"}>
                      <Suspense>
                        <LinkProductList products={products} product={product} />
                      </Suspense>
                    </Show>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-end flex items-center gap-1 justify-end">
                    <GotoProductBtn productId={product.productId} />
                    {product.price.toLocaleString("id-ID")}{" "}
                  </TableCell>
                  <TableCell className="text-end">
                    {product.capital.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-center">{product.qty}</TableCell>
                  <TableCell className="text-end">
                    {Number(
                      new Decimal(product.price).times(product.qty).toFixed(data.record.fix)
                    ).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-end">
                    {product.total.toLocaleString("id-ID")}
                  </TableCell>
                </TableRow>
                <ForEach items={product.discounts}>
                  {(disc) => (
                    <TableRow>
                      <TableCell colSpan={5} className="text-end">
                        Diskon{" "}
                        {disc.kind === "percent"
                          ? `${disc.value}%`
                          : disc.kind === "pcs"
                          ? `${disc.value}pcs`
                          : ""}
                      </TableCell>
                      <TableCell className="text-end">{disc.eff.toLocaleString("id-ID")}</TableCell>
                    </TableRow>
                  )}
                </ForEach>
              </>
            )}
          </ForEach>
        </TableBody>
      </Table>
      <Summary extras={data.extras} record={data.record} productLength={data.products.length} />
      <Show when={data.record.customer.name !== "" && data.record.customer.phone !== ""}>
        <p>
          Pelanggan: {data.record.customer.name} ({data.record.customer.phone})
        </p>
      </Show>
      <Suspense>
        <EditDialog
          isCredit={data.record.isCredit}
          mode={data.record.mode}
          note={data.record.note}
          method={data.record.method}
          methods={methods}
        />
      </Suspense>
      <div className="flex flex-col gap-2">
        <p>
          Dibayar: {formatTime(data.record.paidAt, "long")} | {getDayName(data.record.paidAt)},{" "}
          {formatDate(data.record.paidAt, "long")}
        </p>
        <p>
          Metode: {METHOD_NAMES[data.record.method.kind]} {data.record.method.name}
        </p>
        <p>{data.record.note}</p>
      </div>
    </div>
  );
});
