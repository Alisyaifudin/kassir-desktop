import { Skeleton } from "~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export function Loading() {
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