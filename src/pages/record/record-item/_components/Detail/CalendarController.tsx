import { useTime } from "../../_hooks/use-time";
import { TextError } from "~/components/TextError";
import { Calendar } from "./Calendar";
import { Spinner } from "~/components/Spinner";
import { formatDate, formatTime, getDayName } from "~/lib/utils";
import { memo } from "react";

export const CalendarController = memo(function ({
	timestamp,
	mode,
}: {
	timestamp: number;
	mode: DB.Mode;
}) {
	const { error, loading, handleChange } = useTime(timestamp);
	const name = getDayName(timestamp);
	return (
		<div className="flex gap-2 items-center">
			<p className="text-3xl font-bold pr-5">{mode === "buy" ? "Beli" : "Jual"}</p>
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
