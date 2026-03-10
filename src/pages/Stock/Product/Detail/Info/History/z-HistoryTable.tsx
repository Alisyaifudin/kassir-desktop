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
import { formatDate, formatTime } from "~/lib/date";

export function HistoryTable({
  mode,
  products,
}: {
  products: ProductHistory[];
  mode: "buy" | "sell";
}) {
  const urlBack = encodeURIComponent(window.location.href);
  switch (mode) {
    case "buy":
      return (
        <Table className="text-normal w-fit">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] small:w-[30px]">No</TableHead>
              <TableHead className="text-center w-[170px] small:w-[120px]">Tanggal</TableHead>
              <TableHead className="w-[112px] small:w-[90px]">Waktu</TableHead>
              <TableHead className="text-center">Modal*</TableHead>
              <TableHead className="text-center">Modal</TableHead>
              <TableHead className="text-center w-[50px] small:w-[30px]">Qty</TableHead>
              <TableHead className="icon"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((r, i) => (
              <TableRow key={r.timestamp}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell>{formatDate(r.timestamp).replace(/-/g, "/")}</TableCell>
                <TableCell>{formatTime(r.timestamp, "long")}</TableCell>
                <TableCell className="text-center">
                  {r.capitalRaw.toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-center">{r.capital.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-center w-[50px] small:w-[45px]">{r.qty}</TableCell>
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
              <TableHead className="w-[50px] small:w-[30px]">No</TableHead>
              <TableHead className="text-center w-[170px] small:w-[120px]">Tanggal</TableHead>
              <TableHead className="w-[112px] small:w-[90px]">Waktu</TableHead>
              <TableHead className="text-center">Harga</TableHead>
              <TableHead className="text-center">Qty</TableHead>
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
