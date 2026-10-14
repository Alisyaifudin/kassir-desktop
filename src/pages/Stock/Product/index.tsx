import { Result } from "~/lib/result";
import { useGetProducts } from "../../../hooks/use-get-products";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { ProductPanel } from "./z-ProductPanel";
import { ProductList } from "./z-ProductList";
import { Loading } from "./z-Loading";
import { useScroll } from "~/hooks/use-scroll";

export function ProductEntries() {
  // keeps the ?scroll= restore/remember behaviour the table wrapper used to provide
  const [ref, handleScroll] = useScroll();
  return (
    <>
      <ProductPanel />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="scroll-gutter relative h-auto max-h-full w-full flex-1 min-h-0 overflow-y-auto"
      >
        <Loader />
      </div>
    </>
  );
}

export function Loader() {
  const res = useGetProducts();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent status={500}>{e.message}</ErrorComponent>;
    },
    onSuccess(products) {
      return <ProductList all={products} />;
    },
  });
}
