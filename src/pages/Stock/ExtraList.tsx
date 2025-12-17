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
import { Extra } from "~/database/extra/caches";

type Props = {
  extras: Extra[];
};

export function ExtraList({ extras }: Props) {
  const { start, end } = useInterval(extras.length);
  const backURL = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  return (
    <Table className="text-normal">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">No</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="text-right w-[150px]">Jenis</TableHead>
          <TableHead className="text-right w-[200px]">Nilai Awal</TableHead>
          <TableHead className="icon"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {extras.slice(start, end).map((extra, i) => (
          <TableRow key={i}>
            <TableCell>{i + 1 + start}</TableCell>
            <TableCell>{extra.name}</TableCell>
            <TableCell className="text-right">{label[extra.kind]}</TableCell>
            <TableCell className="text-right">{extra.value.toLocaleString("id-ID")}</TableCell>
            <TableCell className="">
              <Button asChild variant="link" className="p-0 cursor-pointer">
                <Link to={{ pathname: `extra/${extra.id}`, search: `?url_back=${backURL}` }}>
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

const label = {
  percent: "Persen",
  number: "Angka",
};
