import { Result } from "~/lib/result";
import { useId } from "../use-id";
import { History } from "./History";
import { ProductForm } from "./ProductForm";
import { useProduct } from "./use-product";
import { UserInfo } from "./z-UserInfo";
import { Product } from "~/database/product/get-by-id";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="grid grid-cols-2 gap-2 flex-1  overflow-hidden">
      <Detail />
      <History />
    </div>
  );
}

function Detail() {
  const id = useId();
  const res = useProduct(id);
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError(error) {
      switch (error._tag) {
        case "DbError":
          log.error(error.e);
          return <ErrorComponent status={500}>{error.e.message}</ErrorComponent>;
        case "NotFound":
          log.error(error.msg + " id: " + id);
          return <NotFound />;
      }
    },
    onSuccess(product) {
      return <Wrapper product={product} />;
    },
  });
}

function Loading() {
  const role = useUser().role;
  switch (role) {
    case "admin":
      return <LoadingAdmin />;
    case "user":
      return <LoadingUser />;
  }
}

function Wrapper({ product }: { product: Product }) {
  const role = useUser().role;
  switch (role) {
    case "admin":
      return <ProductForm product={product} />;
    case "user":
      return <UserInfo product={product} />;
  }
}

function LoadingAdmin() {
  return (
    <div className="h-full overflow-hidden">
      <div className="flex flex-col p-1 gap-2 text-normal overflow-y-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  );
}

function LoadingUser() {
  return (
    <div className="h-full overflow-y-auto w-full pr-2 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl border border-transparent"
          >
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
