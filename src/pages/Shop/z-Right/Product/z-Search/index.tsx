import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useSearch } from "./use-search";
import { Output } from "./z-Output";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ProductFull } from "~/database/product/cache";
import { useFetchProducts } from "./use-data";

export function Search() {
  return <Loader />;
}

export function Loader() {
  const res = useFetchProducts();
  return Result.match(res, {
    onLoading() {
      return (
        <form className="flex items-end gap-1 px-1">
          <label className="flex flex-col gap-1 w-full">
            <Input
              placeholder="Cari barang..."
              type="search"
              id="searchbar"
              disabled
              aria-autocomplete="list"
            />
          </label>
        </form>
      );
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(products) {
      return <Success products={products} />;
    },
  });
}

function Success({ products: all }: { products: ProductFull[] }) {
  const { handleChange, handleClickProduct, handleSubmit, query, error, products, ref } =
    useSearch(all);
  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
        <label className="flex flex-col gap-1 w-full">
          <Input
            placeholder="Cari barang..."
            ref={ref}
            type="search"
            id="searchbar"
            value={query}
            onChange={handleChange}
            aria-autocomplete="list"
          />
          <TextError>{error}</TextError>
        </label>
      </form>
      <Output
        products={products}
        handleClickProduct={handleClickProduct}
        anchorRef={ref}
        query={query}
      />
    </>
  );
}
