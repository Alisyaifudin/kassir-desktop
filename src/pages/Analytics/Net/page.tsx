import { Suspense } from "react";
import { NavList } from "../NavList";
import { useLoaderData } from "react-router";
import { Loader } from "../Cashflow/loader";
import { Graph } from "./Graph";
import { LoadingBig } from "~/components/Loading";
import { Summary } from "./Summary";
import { DatePicker } from "../DatePicker";

export default function Page() {
  const { records, start, end } = useLoaderData<Loader>();
  return (
    <>
      <NavList selected="net">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
        <DatePicker option="cashflow" defaultInterval="week" />
        <Suspense fallback={<LoadingBig />}>
          <Graph records={records} start={start} end={end} />
        </Suspense>
      </div>
    </>
  );
}
