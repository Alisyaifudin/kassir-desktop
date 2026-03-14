import { Item, Method } from "./z-Item";
import { NewBtn } from "./z-NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./z-TabLink";
import { TextError } from "~/components/TextError";
import { useGetMethods } from "~/hooks/use-get-methods";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Metode Pembayaran</h1>
        <p className="text-muted-foreground text-normal">Kelola metode pembayaran yang tersedia</p>
      </div>

      <div className="space-y-4 ">
        <TabLink />
        <Wrapper />
      </div>

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
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30 animate-pulse">
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      ))}
    </div>
  );
}
