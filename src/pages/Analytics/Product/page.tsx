import { useData } from "./use-data";
import { NavList } from "../z-NavList";
import { LoadingBig } from "~/components/Loading";
import { Summary } from "./z-Summary";
import { ProductList } from "./z-ProductList";
import { Panel } from "./z-Panel";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { SearchInput } from "./z-SearchInput";

export default function Page() {
  return (
    <>
      <NavList selected="products">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 flex-1 overflow-hidden">
        <Panel />
        <SearchInput />
        <Wrapper />
      </div>
    </>
  );
}

function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(items) {
      return <ProductList items={items} />;
    },
  });
}
