import { NavList } from "../z-NavList";
import { Graph } from "./z-Graph";
import { LoadingBig } from "~/components/Loading";
import { Summary } from "./z-Summary";
import { Panel } from "./z-Panel";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";

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
      return <LoadingBig />;
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
