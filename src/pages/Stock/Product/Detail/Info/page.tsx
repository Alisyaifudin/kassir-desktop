import { Result } from "~/lib/result";
import { useId } from "../use-id";
import { History } from "./History";
import { ProductForm } from "./ProductForm";
import { useProduct } from "./use-product";
import { UserInfo } from "./z-UserInfo";
import { Product } from "~/database/product/get-by-id";
import { LoadingBig } from "~/components/Loading";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { useUser } from "~/hooks/use-user";

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
  // const role = auth.user().role;
  return <LoadingBig />;
  // switch (role) {
  //   case "admin":
  //     return <ProductForm product={product} />;
  //   case "user":
  //     return <UserInfo product={product} />;
  // }
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
