import { NavList } from "../z-NavList";
import { useData } from "./use-data";
import { Graph } from "./z-Graph";
import { LoadingBig } from "~/components/Loading";
import { Summary } from "./z-Summary";
import { Panel } from "./z-Panel";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";

export default function Page() {
  return (
    <>
      <NavList selected="cashflow">
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
    onSuccess({ debts, labels, revenues, spendings, interval }) {
      return (
        <Graph
          debts={debts}
          labels={labels}
          revenues={revenues}
          interval={interval}
          spendings={spendings}
        />
      );
    },
  });
}
