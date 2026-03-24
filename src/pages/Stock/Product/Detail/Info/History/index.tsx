import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { HistoryTable } from "./z-HistoryTable";
import { usePage } from "./use-page";
import { useMode } from "./use-mode";
import { useHistory } from "./use-history";
import { useId } from "../../use-id";
import { Result } from "~/lib/result";
import { ErrorComponent } from "~/components/ErrorComponent";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ProductHistory } from "~/database/product/get-history-before";

export function History() {
  const id = useId();
  const res = useHistory(id);
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess({ histories, total }) {
      return <HistoryList histories={histories} total={total} />;
    },
  });
}

function Loading() {
  return (
    <div className="flex flex-col gap-2 w-full p-1 h-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex gap-5 items-center">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="max-h-full overflow-hidden flex">
          <Table className="text-normal w-fit">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] small:w-[30px]">No</TableHead>
                <TableHead className="text-center w-[170px] small:w-[120px]">Tanggal</TableHead>
                <TableHead className="w-[112px] small:w-[90px]">Waktu</TableHead>
                <TableHead className="text-center">Harga/Modal</TableHead>
                <TableHead className="text-center w-[50px] small:w-[45px]">Qty</TableHead>
                <TableHead className="icon"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ histories, total }: { histories: ProductHistory[]; total: number }) {
  const [page, setPage] = usePage();
  const [mode, setMode] = useMode();
  const handlePrev = () => {
    const newPage = page > 0 ? page - 1 : 1;
    setPage(newPage);
  };
  const handleNext = () => {
    const newPage = page < total ? page + 1 : total;
    setPage(newPage);
  };
  return (
    <div className="flex flex-col  gap-2 w-full p-1 h-full overflow-hidden">
      <div className="flex items-center justify-between">
        <RadioGroup
          value={mode}
          className="flex items-center gap-5"
          onValueChange={(v) => {
            const parsed = z.enum(["sell", "buy"]).safeParse(v);
            setMode(parsed.success ? parsed.data : "sell");
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sell" id="sell" />
            <Label htmlFor="sell" className="text-3xl">
              Jual
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="buy" id="buy" />
            <Label htmlFor="buy" className="text-3xl">
              Beli
            </Label>
          </div>
        </RadioGroup>
        <div className="flex gap-5 items-center">
          <Button onClick={handlePrev} disabled={page === 1}>
            <ChevronLeft className="icon" />
          </Button>
          <span>
            {page}/{total}
          </span>
          <Button onClick={handleNext} disabled={page === total || total === 0}>
            <ChevronRight className="icon" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="max-h-full overflow-hidden flex">
          <HistoryTable products={histories} mode={mode} />
        </div>
      </div>
    </div>
  );
}
