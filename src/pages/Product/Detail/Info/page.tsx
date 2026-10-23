import { Gate } from "~/components/page-data";
import { TextError } from "~/components/TextError";
import { NotFound } from "~/components/NotFound";
import { Skeleton } from "~/components/ui/skeleton";
import { useUser } from "~/hooks/use-user";
import { pageData } from "../data";
import { useId } from "../use-id";
import { History } from "./History";
import { EditPane } from "./z-EditPane";
import { UserInfo } from "./z-UserInfo";

/** The tab's body is the data; its header and tabs already painted above. */
export default function Page() {
  const id = useId();
  const res = pageData.use("products");
  const role = useUser().role;

  return (
    <Gate
      res={res}
      skeleton={<Loading />}
      error={(error) => <TextError>{error.message}</TextError>}
    >
      {({ data: products }) => {
        const product = products.find((item) => item.id === id);
        if (product === undefined) return <NotFound />;
        return (
          <div className="grid h-full grid-cols-1 gap-3 overflow-hidden p-4 lg:grid-cols-[1fr_560px]">
            <div className="min-h-0 overflow-y-auto px-1">
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
    </Gate>
  );
}

function Loading() {
  return (
    <div className="grid h-full grid-cols-1 gap-3 p-4 lg:grid-cols-[1fr_560px]">
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
