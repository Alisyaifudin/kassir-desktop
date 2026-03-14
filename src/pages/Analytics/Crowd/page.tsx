import { useData } from "./use-data";
import { NavList } from "../z-NavList";
import { Summary } from "./z-Summary";
import { Crowd } from "./z-Crowd";
import { DatePicker } from "../z-DatePicker";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <>
      <NavList selected="crowd">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
        <DatePicker defaultInterval="day" />
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
    onSuccess({ daily, weekly }) {
      return <Crowd daily={daily} weekly={weekly} />;
    },
  });
}

function Loading() {
  return (
    <div className="flex flex-col gap-3 flex-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden">
        <Skeleton className="h-full w-full" />
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}
