import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useSearch } from "./use-search";
import { Output } from "./z-Output";
import { useEffect } from "react";
import { Kbd } from "~/components/ui/kdb";
import { useMode } from "../../use-transaction";
import { useTab } from "../../use-tab";

export function Search() {
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
  } = useSearch();
  const [tab] = useTab();
  const [mode] = useMode();
  useEffect(() => {
    if (ref.current === null) return;
    setTimeout(() => {
      ref.current!.focus();
    }, 1);
  }, [ref, tab, mode]);
  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
        <label className="flex flex-col gap-1 w-full">
          <div>
            <span>
              Cari: <Kbd>F1</Kbd>
            </span>
          </div>
          <Input
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
        extras={extras}
        handleClickExtra={handleClickExtra}
      />
    </>
  );
}
