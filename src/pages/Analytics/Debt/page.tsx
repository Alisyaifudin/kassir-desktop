import { NavList } from "../z-NavList";
import { useData } from "./use-data";
import { Summary } from "./z-Summary";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Loading as LoadingIndicator } from "~/components/Loading";
import { DebtTable } from "./z-DebtTable.tsx";

export default function Page() {
  return (
    <>
      <NavList selected="debt">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
        <Wrapper />
      </div>
    </>
  );
}

function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return <ErrorComponent>{e.message}</ErrorComponent>;
    },
    onSuccess(records) {
      return <DebtTable records={records} />;
    },
  });
}

function Loading() {
  return <LoadingIndicator />;
}
