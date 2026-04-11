import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { GotoProductBtn } from "./z-GotoProductBtn";
import { Footer } from "./z-Footer";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { EditDialog } from "./z-Edit";
import { Summary } from "./z-Summary";
import { LinkProductList } from "./z-LinkProduct";
import { cn } from "~/lib/utils";
import { DebtDialog } from "./z-Debt";
import { RecordData } from "../use-data";
import Decimal from "decimal.js";
import { DeleteBtn } from "./z-DeleteBtn";
import { useUser } from "~/hooks/use-user";
import { useLoadProducts } from "./use-load-products";

export function Detail({ data }: { data: RecordData }) {
  const role = useUser().role;
  useLoadProducts(role);
  return (
    <div className="flex flex-col gap-2 text-3xl">
      <Table className="text-normal">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[93px] small:w-[80px]">No</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="text-end w-[170px] small:w-[100px]">Satuan</TableHead>
            <Show when={data.record.mode === "buy"}>
              <TableHead className="text-end w-[170px] small:w-[100px]">Modal*</TableHead>
              <TableHead className="text-end w-[170px] small:w-[100px]">Modal</TableHead>
            </Show>
            <TableHead className="text-end w-[57px] small:w-[40px]">Qty</TableHead>
            <TableHead className="text-end w-[170px] small:w-[100px]">Total</TableHead>
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
                      <LinkProductList recordId={data.record.id} product={product} />
                    </Show>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-end flex items-center gap-1 justify-end">
                    <GotoProductBtn recordId={data.record.id} productId={product.productId} />
                    {product.price.toLocaleString("id-ID")}{" "}
                  </TableCell>
                  <Show when={data.record.mode === "buy"}>
                    <TableCell className="text-end">
                      {product.capitalRaw.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-end">
                      {product.capital.toLocaleString("id-ID")}
                    </TableCell>
                  </Show>
                  <TableCell className="text-end">{product.qty}</TableCell>
                  <TableCell className={cn("text-end", { italic: product.discounts.length > 0 })}>
                    {Number(
                      new Decimal(product.price).times(product.qty).toFixed(data.record.fix),
                    ).toLocaleString("id-ID")}
                  </TableCell>
                </TableRow>
                <ForEach items={transformDisc(product.price, product.qty, product.discounts)}>
                  {(disc) => (
                    <TableRow>
                      <TableCell colSpan={data.record.mode === "buy" ? 4 : 2} className="text-end">
                        Diskon{" "}
                        {disc.kind === "percent"
                          ? `${disc.value}%`
                          : disc.kind === "pcs"
                            ? `${disc.value}pcs`
                            : ""}
                      </TableCell>
                      <TableCell colSpan={2} className="text-end">
                        {disc.eff.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-end">
                        {disc.subtotal.toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  )}
                </ForEach>
              </>
            )}
          </ForEach>
        </TableBody>
      </Table>
      <Summary extras={data.extras} record={data.record} productLength={data.products.length} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EditDialog
            isCredit={data.record.isCredit}
            mode={data.record.mode}
            note={data.record.note}
            method={data.record.method}
            recordId={data.record.id}
          />
          <Show when={data.record.isCredit && role === "admin"}>
            <DebtDialog grandTotal={data.record.grandTotal} recordId={data.record.id} />
          </Show>
        </div>
        <DeleteBtn recordId={data.record.id} />
      </div>
      <Footer
        cashier={data.record.cashier}
        mode={data.record.mode}
        recordId={data.record.id}
        paidAt={data.record.paidAt}
        method={data.record.method}
        note={data.record.note}
        customer={data.record.customer}
      />
    </div>
  );
}

type Disc = RecordData["products"][number]["discounts"][number];
type DiscT = Disc & { subtotal: number };

function transformDisc(price: number, qty: number, discounts: Disc[]): DiscT[] {
  const discs = [];
  let subtotal = new Decimal(price).times(qty);
  for (const d of discounts) {
    subtotal = subtotal.minus(d.eff);
    discs.push({
      ...d,
      subtotal: subtotal.toNumber(),
    });
  }
  return discs;
}
