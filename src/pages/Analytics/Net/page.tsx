import { NavList } from "../z-NavList";
import { Graph } from "./z-Graph";
import { Summary } from "./z-Summary";
import { Panel } from "./z-Panel";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <>
      <NavList selected="net">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
        <Panel />
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
    onSuccess({ labels, profits }) {
      return <Graph labels={labels} profits={profits} />;
    },
  });
}

function Loading() {
  return (
    <div className="flex flex-col gap-2 flex-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}
