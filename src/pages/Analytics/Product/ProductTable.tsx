import { Pencil } from "lucide-react";
import { useNavigate } from "react-router";
import { Fragment } from "react/jsx-runtime";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Item } from "~/database/product/get-by-range";
import { useSize } from "~/hooks/use-size";
import { formatBarcode, formatDate, formatTime } from "~/lib/utils";

const style = {
  small: {
    no: {
      width: "60px",
    },
    barcode: {
      width: "150px",
    },
    price: {
      width: "100px",
    },
    qty: {
      width: "40px",
    },
  },
  big: {
    no: {
      width: "60px",
    },
    barcode: {
      width: "150px",
    },
    price: {
      width: "100px",
    },
    qty: {
      width: "40px",
    },
  },
};

export function ProductTable({ items }: { items: Item[] }) {
  const size = useSize();
  const navigate = useNavigate();
  const clickProduct = (id: number) => () => {
    navigate({
      pathname: `/stock/product/${id}`,
      search: `?url_back=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    });
  };
  const clickRecord = (timestamp: number) => () => {
    navigate({
      pathname: `/records/${timestamp}`,
      search: `?url_back=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    });
  };
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead style={style[size].no}>No</TableHead>
          <TableHead style={style[size].barcode}>Barcode</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead style={style[size].price} className="text-end">
            Harga
          </TableHead>
          <TableHead style={style[size].price} className="text-end">
            Modal
          </TableHead>
          <TableHead style={style[size].qty}>Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, i) => {
          if (item.kind === "raw") {
            return (
              <TableRow key={i} className={item.price <= item.capital ? "bg-red-300" : ""}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-normal">
                  {item.name}
                  <button className="cursor-pointer" onClick={clickProduct(item.id)}>
                    <Pencil className="icon" />
                  </button>
                </TableCell>
                <TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-end">{item.qty}</TableCell>
              </TableRow>
            );
          }
          if (item.items.length === 0) return null;
          return (
            <Fragment key={i}>
              <TableRow className={item.price <= item.capital ? "bg-red-300" : ""}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell>{formatBarcode(item.barcode)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-between h-full">
                    <Show when={item.items.length === 1} fallback={item.name}>
                      <button
                        className="cursor-pointer text-start"
                        onClick={clickRecord(item.items[0].timestamp)}
                      >
                        {item.name}
                      </button>
                    </Show>
                    <button className="cursor-pointer" onClick={clickProduct(item.id)}>
                      <Pencil className="icon" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-end">{item.qty}</TableCell>
              </TableRow>
              <Show when={item.items.length > 1}>
                <ForEach items={item.items}>
                  {(it, j) => (
                    <TableRow className={it.price <= item.capital ? "bg-red-300" : ""}>
                      <TableCell>
                        {i + 1}.{j + 1}
                      </TableCell>
                      <TableCell>
                        {formatDate(it.timestamp).split("-").at(-1)} - {formatTime(it.timestamp)}
                      </TableCell>
                      <TableCell className="flex items-center justify-between">
                        <button
                          className="cursor-pointer italic"
                          onClick={clickRecord(it.timestamp)}
                        >
                          {it.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-end">{it.price.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-end">
                        {item.capital.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-end">{it.qty}</TableCell>
                    </TableRow>
                  )}
                </ForEach>
              </Show>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
