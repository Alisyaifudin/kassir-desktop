import { Loader, useStream } from "~/components/Loader";
import { NotFound } from "~/components/NotFound";
import { Skeleton } from "~/components/ui/skeleton";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import { useId } from "../use-id";
import { History } from "./History";
import { EditPane } from "./z-EditPane";
import { UserInfo } from "./z-UserInfo";

export default function Page() {
  const id = useId();
  const res = useStream(service.product.get.changesFull);
  const role = useUser().role;

  return (
    <Loader res={res} fallback={<Loading />}>
      {({ data: products }) => {
        const product = products.find((item) => item.id === id);
        if (product === undefined) return <NotFound />;
        return (
          <div className="grid h-full grid-cols-1 gap-3 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
            <div className="min-h-0 overflow-y-auto pr-1">
              {role === "admin" ? (
                <EditPane product={product} />
              ) : (
                <UserInfo product={product} />
              )}
            </div>
            <div className="min-h-0 overflow-hidden">
              <History productId={product.id} revision={product.updatedAt} />
            </div>
          </div>
        );
      }}
    </Loader>
  );
}

function Loading() {
  return (
    <div className="grid h-full grid-cols-1 gap-3 p-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-full w-full" />
    </div>
  );
}
