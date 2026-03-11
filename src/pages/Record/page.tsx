import { Header } from "./z-Header";
import { Record } from "./z-Record";
import { Data, useRecords } from "./use-records";
import { cn } from "~/lib/utils";
import { LoadingBig } from "~/components/Loading";
import { Detail } from "./z-Detail";
import { Show } from "~/components/Show";
import { useSelected } from "./use-selected";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";

export default function Page() {
  return (
    <main className="flex flex-col gap-2 p-0.5 flex-1 text-3xl overflow-hidden">
      <Header />
      <Loader />
    </main>
  );
}

function Loader() {
  const res = useRecords();
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(records) {
      return <Wrapper records={records} />;
    },
  });
}

function Wrapper({ records }: { records: Data[] }) {
  const [selected] = useSelected();
  const record = selected === null ? undefined : records.find((r) => r.record.paidAt === selected);
  return (
    <div
      className={cn(
        "grid gap-2 h-full overflow-hidden grid-cols-[490px_1px_1fr] small:grid-cols-[335px_1px_1fr]",
      )}
    >
      <Record records={records} />
      <div className="border-l" />
      <Show value={record}>
        {({ record, extras, products }) => (
          <Detail extras={extras} products={products} record={record} />
        )}
      </Show>
    </div>
  );
}
