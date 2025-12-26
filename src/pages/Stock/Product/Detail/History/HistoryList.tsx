import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
} from "~/components/ui/table";
import { ProductHistory } from "~/database/product/history";
import { useSize } from "~/hooks/use-size";
import { formatDate, formatTime } from "~/lib/utils";

const style = {
  small: {
    no: {
      width: "30px",
    },
    date: {
      width: "120px",
    },
    time: {
      width: "90px",
    },
    qty: {
      width: "45px",
    },
  },
  big: {
    no: {
      width: "50px",
    },
    date: {
      width: "170px",
    },
    time: {
      width: "112px",
    },
    qty: {
      width: "50px",
    },
  },
};

export function HistoryTable({
  mode,
  products,
  id,
}: {
  products: ProductHistory[];
  mode: "buy" | "sell";
  id: number;
}) {
  const size = useSize();
  const urlBack = encodeURIComponent(`/stock/product/${id}`);
  switch (mode) {
    case "buy":
      return (
        <Table className="text-normal w-fit">
          <TableHeader>
            <TableRow>
              <TableHead style={style[size].no}>No</TableHead>
              <TableHead style={style[size].date} className="text-center">
                Tanggal
              </TableHead>
              <TableHead style={style[size].time}>Waktu</TableHead>
              <TableHead className="text-center">Modal*</TableHead>
              <TableHead className="text-center">Modal</TableHead>
              <TableHead style={style[size].no} className="text-center">
                Qty
              </TableHead>
              <TableHead className="icon"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products
              .filter((p) => p.mode === mode)
              .map((r, i) => (
                <TableRow key={r.timestamp}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>{formatDate(r.timestamp).replace(/-/g, "/")}</TableCell>
                  <TableCell>{formatTime(r.timestamp, "long")}</TableCell>
                  <TableCell className="text-center">
                    {r.capitalRaw.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-center">{r.capital.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-center">{r.qty}</TableCell>
                  <TableCell>
                    <Link
                      to={{ pathname: `/records/${r.timestamp}`, search: `?url_back=${urlBack}` }}
                    >
                      <ExternalLink className="icon" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      );
    case "sell":
      return (
        <Table className="text-normal w-fit">
          <TableHeader>
            <TableRow>
              <TableHead style={style[size].no}>No</TableHead>
              <TableHead style={style[size].date} className="text-center pr-2">
                Tanggal
              </TableHead>
              <TableHead style={style[size].time}>Waktu</TableHead>
              <TableHead className="text-center">Harga</TableHead>
              <TableHead style={style[size].qty} className="text-center">
                Qty
              </TableHead>
              <TableHead className="icon"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products
              .filter((p) => p.mode === mode)
              .map((r, i) => (
                <TableRow key={r.timestamp}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>{formatDate(r.timestamp).replace(/-/g, "/")}</TableCell>
                  <TableCell>{formatTime(r.timestamp, "long")}</TableCell>
                  <TableCell className="text-center">{r.price.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-center">{r.qty}</TableCell>
                  <TableCell>
                    <Link
                      to={{ pathname: `/records/${r.timestamp}`, search: `?url_back=${urlBack}` }}
                    >
                      <ExternalLink className="icon" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      );
  }
}
