import { DefaultError, Result } from "~/lib/utils";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { NavList } from "../NavList";
import { LoadingBig } from "~/components/Loading";
import { Suspense, use } from "react";
import { Summary } from "./Summary";
import { Record } from "~/database/record/get-by-range";
import { TextError } from "~/components/TextError";
import { Crowd } from "./Crowd";
import { useTime } from "../use-time";
import { DatePickerCrowd } from "./DatePicker";

export default function Page() {
  const { records, start, end } = useLoaderData<Loader>();
  const [time, setTime] = useTime();
  return (
    <>
      <NavList selected="crowd">
        <Summary />
      </NavList>
      <div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
        <DatePickerCrowd setTime={setTime} time={time} />
        <Suspense fallback={<LoadingBig />}>
          <Wrapper records={records} start={start} end={end} />
        </Suspense>
      </div>
    </>
  );
}

function Wrapper({
  start,
  end,
  records: promise,
}: {
  start: number;
  end: number;
  records: Promise<Result<DefaultError, Record[]>>;
}) {
  const [errMsg, records] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return <Crowd records={records} start={start} end={end} />;
}
