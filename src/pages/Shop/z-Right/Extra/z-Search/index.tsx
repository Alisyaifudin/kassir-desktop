import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useSearch } from "./use-search";
import { Output } from "./z-Output";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Extra } from "~/database/extra/cache";
import { useFetchExtras } from "./use-data";

export function Search() {
  return <Loader />;
}

export function Loader() {
  const res = useFetchExtras();
  return Result.match(res, {
    onLoading() {
      return (
        <form className="flex items-end gap-1 px-1">
          <label className="flex flex-col gap-1 w-full">
            <Input
              placeholder="Cari biaya tambahan..."
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
    onSuccess(extras) {
      return <Success extras={extras} />;
    },
  });
}

function Success({ extras: all }: { extras: Extra[] }) {
  const { handleChange, handleClickExtra, handleSubmit, query, error, extras, ref } =
    useSearch(all);
  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
        <label className="flex flex-col gap-1 w-full">
          <Input
            placeholder="Cari biaya tambahan..."
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
        extras={extras}
        handleClickExtra={handleClickExtra}
        anchorRef={ref}
        query={query}
      />
    </>
  );
}
