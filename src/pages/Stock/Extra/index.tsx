import { Result } from "~/lib/result";
import { useData } from "./use-data";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { ExtraPanel } from "./z-ExtraPanel";
import { ExtraList } from "./z-ExtraList";
import { Table, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Loading } from "./z-Loading";

export function ExtraEntries() {
  return (
    <>
      <ExtraPanel />
      <div className="flex-1 overflow-hidden min-h-0 w-full">
        <div className="flex flex-col h-full overflow-hidden">
          <Table className="text-normal flex-1 h-full" parentClass="h-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right w-[150px]">Jenis</TableHead>
                <TableHead className="text-right w-[200px]">Nilai Awal</TableHead>
                <TableHead className="icon"></TableHead>
              </TableRow>
            </TableHeader>
            <Loader />
          </Table>
        </div>
      </div>
    </>
  );
}

function Loader() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent status={500}>{e.message}</ErrorComponent>;
    },
    onSuccess(extras) {
      return <ExtraList all={extras} />;
    },
  });
}
