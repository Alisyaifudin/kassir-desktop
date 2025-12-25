import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useSearch } from "./use-search";
import { Output } from "./Output";
import { useEffect } from "react";
import { useAtom } from "@xstate/store/react";
import { dbLoaded } from "../use-load-db";
import { Spinner } from "~/components/Spinner";
import { Kbd } from "~/components/ui/kdb";
import { useTab } from "../../use-tab";
import { useMode } from "../../use-transaction";

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
  const { loading, error: errorDB } = useAtom(dbLoaded);
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
            <Spinner when={loading} />
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
      <TextError>{errorDB}</TextError>
    </>
  );
}
