import { Info } from "./z-Info";
import { ExtraForm } from "./z-ExtraForm";
import { Extra } from "~/database/extra/cache";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page({ id }: { id: string }) {
  return (
    <main className="py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden">
      <div className="flex gap-2 h-full max-h-[calc(100vh-170px)] overflow-hidden">
        <Loader id={id} />
      </div>
    </main>
  );
}

function Loader({ id }: { id: string }) {
  const res = useData(id);
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError(error) {
      switch (error._tag) {
        case "DbError":
          log.error(error.e);
          return <ErrorComponent>{error.e.message}</ErrorComponent>;
        case "NotFound":
          return <NotFound />;
      }
    },
    onSuccess(extra) {
      return <Detail extra={extra} />;
    },
  });
}

function Loading() {
  const role = useUser().role;
  switch (role) {
    case "admin":
      return (
        <div className="flex flex-col py-1 gap-2 text-normal mx-auto w-full max-w-4xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      );
    case "user":
      return (
        <div className="grid grid-cols-[150px_1fr] h-fit gap-3 w-full">
          <Skeleton className="h-8 w-64 col-span-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="contents">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-48" />
            </div>
          ))}
        </div>
      );
  }
}

function Detail({ extra }: { extra: Extra }) {
  const role = useUser().role;
  switch (role) {
    case "admin":
      return <ExtraForm extra={extra} />;
    case "user":
      return <Info extra={extra} />;
  }
}
