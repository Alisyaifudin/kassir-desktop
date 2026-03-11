import { useData } from "./use-data";
import { NavList } from "../z-NavList";
import { LoadingBig } from "~/components/Loading";
import { Summary } from "./z-Summary";
import { Crowd } from "./z-Crowd";
import { DatePicker } from "../z-DatePicker";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";

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
      return <LoadingBig />;
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
