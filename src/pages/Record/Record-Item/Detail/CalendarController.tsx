import { TextError } from "~/components/TextError";
import { Calendar } from "./Calendar";
import { Spinner } from "~/components/Spinner";
import { formatDate, formatTime, getDayName } from "~/lib/utils";
import { memo, useCallback } from "react";
import { useSubmit } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { useLoading } from "~/hooks/use-loading";
import { Size } from "~/lib/store-old";

export const CalendarController = memo(function ({
  timestamp,
  mode,
}: {
  timestamp: number;
  mode: DB.Mode;
}) {
  const name = getDayName(timestamp);
  const submit = useSubmit();
  const error = useAction<Action>()("change-timestamp");
  const loading = useLoading();
  const handleChange = useCallback(
    (time: number) => {
      const formdata = new FormData();
      formdata.set("action", "change-timestamp");
      formdata.set("timestamp", time.toString());
      submit(formdata, { method: "post" });
    },
    [timestamp]
  );
  return (
    <div className="flex gap-2 items-center">
      <p className="font-bold pr-5">{mode === "buy" ? "Beli" : "Jual"}</p>
      <TextError>{error}</TextError>
      <Calendar time={timestamp} setTime={handleChange}>
        <p>
          {formatTime(timestamp, "long")} {name}, {formatDate(timestamp, "long")}
        </p>
      </Calendar>
      <Spinner when={loading} />
    </div>
  );
});
