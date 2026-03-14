import { Item, Method } from "./z-Item";
import { NewBtn } from "./z-NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./z-TabLink";
import { Suspense } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { useGetMethods } from "~/hooks/use-get-methods";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 p-5 flex-1 overflow-auto">
      <h1 className="text-big font-bold">Metode Pembayaran</h1>
      <TabLink />
      <Suspense fallback={<Loading />}>
        <Wrapper />
      </Suspense>
      <NewBtn />
    </div>
  );
}

function Wrapper() {
  const res = useGetMethods();
  const [method] = useMethod();
  return Result.match(res, {
    onLoading() {
      return <LoadingList />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess([data, defaultMethod]) {
      const methods = data.filter((d) => d.kind === method && d.name !== undefined) as Method[];
      return (
        <div className="flex flex-col gap-2 overflow-auto">
          {methods.map((m) => {
            const kind = m.kind;
            const defVal = defaultMethod[kind];
            return <Item key={m.id} method={m} defVal={defVal} />;
          })}
        </div>
      );
    },
  });
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-2 overflow-auto">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-1 p-0.5 w-full">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  );
}
