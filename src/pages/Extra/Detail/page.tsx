import { Info } from "./z-Info";
import { ExtraForm } from "./z-ExtraForm";
import { NotFound } from "~/components/NotFound";
import { service } from "~/services";
import type { Extra } from "~/services/extra";
import { useUser } from "~/hooks/use-user";
import { Skeleton } from "~/components/ui/skeleton";
import { ExtraErrorFallback } from "../z-Error";
import { pageData } from "../data";

export default function Page({ id }: { id: string }) {
  return (
    <pageData.Provider sources={{ extras: service.extra.get.changes }}>
      <main className="py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden">
        <div className="flex gap-2 h-full max-h-[calc(100vh-170px)] overflow-hidden">
          <pageData.Gate
            keys={["extras"]}
            pulse={<Loading />}
            error={(error) => <ExtraErrorFallback error={error} />}
          >
            {({ extras }) => {
              // The row can be deleted from elsewhere, or the id hand-edited.
              const extra = extras.find((item) => item.id === id);
              if (extra === undefined) return <NotFound />;
              return <Detail extra={extra} />;
            }}
          </pageData.Gate>
        </div>
      </main>
    </pageData.Provider>
  );
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
