import { SquareArrowOutUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { useInterval } from "./use-interval";
import { useSize } from "~/hooks/use-size";
import { Product } from "~/database/product/caches";

type Props = {
  products: Product[];
};

const width = {
  big: {
    no: {
      width: "50px",
    },
    code: {
      width: "160px",
    },
    price: {
      width: "100px",
    },
    stock: {
      width: "50px",
    },
    link: {
      width: "30px",
    },
  },
  small: {
    no: {
      width: "50px",
    },
    code: {
      width: "160px",
    },
    price: {
      width: "100px",
    },
    stock: {
      width: "50px",
    },
    link: {
      width: "30px",
    },
  },
};

export function ProductList({ products }: Props) {
  const { start, end } = useInterval(products.length);
  const size = useSize();
  const backURL = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  return (
    <Table className="text-normal flex-1">
      <TableHeader>
        <TableRow>
          <TableHead style={width[size].no}>No</TableHead>
          <TableHead style={width[size].code}>Kode</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-right" style={width[size].price}>
            Harga
          </TableHead>
          <TableHead className="text-right" style={width[size].price}>
            Modal
          </TableHead>
          <TableHead style={width[size].stock}>Stok</TableHead>
          <TableHead style={width[size].link}></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="overflow-auto flex-1 w-full">
        {products.slice(start, end).map((product, i) => (
          <TableRow key={i}>
            <TableCell>{i + 1 + start}</TableCell>
            <TableCell>{formatBarcode(product.barcode)}</TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell className="text-right">{product.price.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-right">{product.capital.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-right">{product.stock}</TableCell>
            <TableCell>
              <Button variant="link" className="p-0 cursor-pointer">
                <Link to={{ pathname: `product/${product.id}`, search: `?url_back=${backURL}` }}>
                  <SquareArrowOutUpRight className="icon" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatBarcode(barcode?: string) {
  if (barcode === undefined) return "";
  const chunks = chunkSubstr(barcode, 13);
  return chunks.join("\n");
}

function chunkSubstr(str: string, size: number): string[] {
  const numChunks = Math.ceil(str.length / size);
  const chunks: string[] = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substring(o, size);
  }

  return chunks;
}
