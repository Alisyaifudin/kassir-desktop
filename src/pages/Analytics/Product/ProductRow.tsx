import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useCallback, useState } from "react";
import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { TableCell, TableRow } from "~/components/ui/table";
import { formatBarcode, formatDate, formatTime } from "~/lib/utils";

type Prod = {
  kind: "product";
  id: number;
  name: string;
  barcode?: string;
  price: number;
  capital: number;
  qty: number;
  mode: DB.Mode;
  items: {
    id: number;
    timestamp: number;
    name: string;
    price: number;
    qty: number;
    total: number;
  }[];
};

export function ProductRow({
  item,
  i,
  clickRecord,
  clickProduct,
}: {
  i: number;
  clickRecord: (timestamp: number) => () => void;
  clickProduct: (id: number) => () => void;
  item: Prod;
}) {
  if (item.items.length === 1) {
    return <SingleRow item={item} clickProduct={clickProduct} clickRecord={clickRecord} i={i} />;
  }
  return <MultiRow item={item} clickProduct={clickProduct} clickRecord={clickRecord} i={i} />;
}

function SingleRow({
  item,
  i,
  clickRecord,
  clickProduct,
}: {
  i: number;
  clickRecord: (timestamp: number) => () => void;
  clickProduct: (id: number) => () => void;
  item: Prod;
}) {
  return (
    <TableRow className={item.price <= item.capital ? "bg-red-300" : ""}>
      <TableCell className="font-medium">{i + 1}</TableCell>
      <TableCell>{formatBarcode(item.barcode)}</TableCell>
      <TableCell>
        <div className="flex items-center justify-between h-full">
          <button
            className="cursor-pointer text-start"
            onClick={clickRecord(item.items[0].timestamp)}
          >
            {item.name}
          </button>
          <button className="cursor-pointer" onClick={clickProduct(item.id)}>
            <Pencil className="icon" />
          </button>
        </div>
      </TableCell>
      <TableCell className="text-end">{item.price.toLocaleString("id-ID")}</TableCell>
      <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
      <TableCell className="text-end">{item.qty}</TableCell>
    </TableRow>
  );
}

function MultiRow({
  item,
  i,
  clickRecord,
  clickProduct,
}: {
  i: number;
  clickRecord: (timestamp: number) => () => void;
  clickProduct: (id: number) => () => void;
  item: Prod;
}) {
  const [limit, setLimit] = useState(0);
  const handleMore = useCallback(() => {
    setLimit((prev) => {
      const limit = Math.min(prev + 5, item.items.length);
      return limit;
    });
  }, []);
  const handleReset = useCallback(() => {
    setLimit(0);
  }, []);
  return (
    <>
      <TableRow className={item.price <= item.capital ? "bg-red-300" : ""}>
        <TableCell className="font-medium">{i + 1}</TableCell>
        <TableCell>{formatBarcode(item.barcode)}</TableCell>
        <TableCell>
          <div className="flex items-center justify-between h-full">
            <Show
              when={limit === 0}
              fallback={
                <button className="flex items-center gap-1 hover:bg-muted" onClick={handleReset}>
                  <ChevronUp />
                  <span className="text-start">{item.name}</span>
                </button>
              }
            >
              <button className="flex items-center gap-1 hover:bg-muted" onClick={handleMore}>
                <ChevronDown />
                <span className="text-start">{item.name}</span>
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
      <Show when={limit > 0}>
        <ForEach items={item.items.slice(0, limit)}>
          {(it, j) => (
            <TableRow className={it.price <= item.capital ? "bg-red-300" : ""}>
              <TableCell>
                {i + 1}.{j + 1}
              </TableCell>
              <TableCell>
                {formatDate(it.timestamp).split("-").at(-1)} - {formatTime(it.timestamp)}
              </TableCell>
              <TableCell className="flex items-center justify-between">
                <button className="cursor-pointer italic" onClick={clickRecord(it.timestamp)}>
                  {it.name}
                </button>
              </TableCell>
              <TableCell className="text-end">{it.price.toLocaleString("id-ID")}</TableCell>
              <TableCell className="text-end">{item.capital.toLocaleString("id-ID")}</TableCell>
              <TableCell className="text-end">{it.qty}</TableCell>
            </TableRow>
          )}
        </ForEach>
        <TableRow>
          <TableCell colSpan={6} className="text-end">
            Menampilkan {limit} / {item.items.length}
            <Show when={limit < item.items.length}>
              {" "}
              |{" "}
              <button className="underline" onClick={handleMore}>
                Lebih banyak
              </button>
            </Show>
          </TableCell>
        </TableRow>
      </Show>
    </>
  );
}
