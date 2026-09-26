import { Layout } from "./z-Layout";
import { ExtraPanel } from "./z-ExtraPanel";
import { Table, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { Loading } from "./z-LoadingTable";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { ExtraList } from "./z-ExtraList";

export default function Page() {
  return (
    <Layout className="flex flex-col gap-5 py-2 px-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <ExtraPanel />
      <div className="flex-1 overflow-hidden min-h-0 w-full">
        <div className="flex flex-col h-full overflow-hidden">
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
            <Loader />
          </Table>
        </div>
      </div>
    </Layout>
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
