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
import { ProductHistory } from "~/database/old/product";
import { formatDate, formatTime } from "~/lib/utils";

export function HistoryTable({
  mode,
  products,
  id,
}: {
  products: ProductHistory[];
  mode: "buy" | "sell";
  id: number;
}) {
  const urlBack = encodeURIComponent(`/stock/product/${id}`);
  switch (mode) {
    case "buy":
      return (
        <Table className="text-normal w-fit">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">No</TableHead>
              <TableHead className="w-[150px]">Tanggal</TableHead>
              <TableHead className="w-[100px]">Waktu</TableHead>
              <TableHead className="w-[200px] text-center">Modal</TableHead>
              <TableHead className="w-[100px] text-center">Jumlah</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
                  <TableCell className="text-center">{r.capital.toLocaleString("id-DE")}</TableCell>
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
              <TableHead className="w-[60px]">No</TableHead>
              <TableHead className="w-[200px]">Tanggal</TableHead>
              <TableHead className="w-[200px]">Waktu</TableHead>
              <TableHead className="w-[200px] text-center">Jumlah</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
