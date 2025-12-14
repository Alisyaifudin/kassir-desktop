import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useSearch } from "./use-search";
import { Field } from "./Field";
import { Output } from "./Output";
import { Product } from "~/database/product/caches";
import { Extra } from "~/database/extra/caches";

export function Search({
  products: allProducts,
  extras: allExtras,
}: {
  products: Product[];
  extras: Extra[];
}) {
  const {
    handleChange,
    handleClickProduct,
    handleClickExtra,
    handleSubmit,
    query,
    error,
    products,
    extras,
    ref,
  } = useSearch(allProducts, allExtras);
  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
        <Field label="Cari">
          <Input
            ref={ref}
            type="search"
            value={query}
            onChange={handleChange}
            aria-autocomplete="list"
          />
        </Field>
      </form>
      {error ? <TextError>{error}</TextError> : null}
      <Output
        products={products}
        handleClickProduct={handleClickProduct}
        extras={extras}
        handleClickExtra={handleClickExtra}
      />
    </>
  );
}
