import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Product } from "~/database/product/get-performance";
import { useSize } from "~/hooks/use-size";
import { formatBarcode } from "~/lib/utils";

const style = {
  small: {
    no: {
      width: "60px",
    },
    barcode: {
      width: "150px",
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
    qty: {
      width: "40px",
    },
  },
};

export function ItemTable({ items }: { items: Product[] }) {
  const size = useSize();
  // const navigate = useNavigate();
  // const clickProduct = (id: number) => () => {
  //   navigate({
  //     pathname: `/stock/product/${id}`,
  //     search: `?url_back=${encodeURIComponent(window.location.pathname + window.location.search)}`,
  //   });
  // };
  // const clickRecord = (timestamp: number) => () => {
  //   navigate({
  //     pathname: `/records/${timestamp}`,
  //     search: `?url_back=${encodeURIComponent(window.location.pathname + window.location.search)}`,
  //   });
  // };
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead style={style[size].no}>No</TableHead>
          <TableHead style={style[size].barcode}>Barcode</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead style={style[size].qty}>Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, i) => {
          return (
            <TableRow key={i}>
              <TableCell className="font-medium">{i + 1}</TableCell>
              <TableCell>{formatBarcode(item.barcode)}</TableCell>
              <TableCell className="text-normal">{item.name}</TableCell>
              <TableCell className="text-end">{item.qty}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
