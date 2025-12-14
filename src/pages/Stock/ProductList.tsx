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
import { useNavigate } from "react-router";
import { useInterval } from "./use-interval";
import { Size } from "~/lib/store-old";

type Props = {
  products: DB.Product[];
  size: Size;
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

export function ProductList({ products, size }: Props) {
  const { start, end } = useInterval(products.length);
  const navigate = useNavigate();
  const handleClick = (id: number) => () => {
    const backURL = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    navigate({ pathname: `product/${id}`, search: `?url_back=${backURL}` });
  };
  return (
    <Table className="text-normal">
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
      <TableBody>
        {products.slice(start, end).map((product, i) => (
          <TableRow key={i}>
            <TableCell>{i + 1 + start}</TableCell>
            {/* <TableCell>{product.barcode ?? ""}</TableCell> */}
            <TableCell>{formatBarcdode(product.barcode)}</TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell className="text-right">{product.price.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-right">{product.capital.toLocaleString("id-ID")}</TableCell>
            <TableCell className="text-right">{product.stock}</TableCell>
            <TableCell>
              <Button
                variant="link"
                className="p-0 cursor-pointer"
                onClick={handleClick(product.id)}
              >
                <SquareArrowOutUpRight className="icon" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatBarcdode(barcode: string | null) {
  if (barcode === null) return "";
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
