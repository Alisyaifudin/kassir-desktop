import { CashierCheckbox } from "./z-CashierCheckbox";
import { SelectSize } from "./z-SelectSize";
import { Info } from "./z-Info";
import { TextError } from "~/components/TextError";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 w-full overflow-auto pb-3">
      <Wrapper />
      <SelectSize />
    </div>
  );
}

function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(info) {
      const { owner, address, header, footer, showCashier } = info;
      return (
        <>
          <Info owner={owner} address={address} header={header} footer={footer} />
          <CashierCheckbox showCashier={showCashier} />
        </>
      );
    },
  });
}

function Loading() {
  return (
    <>
      <div className="flex flex-col gap-2 p-0.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-[160px_1fr] small:grid-cols-[100px_1fr] text-normal items-center gap-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-1 p-0.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
    </>
  );
}
