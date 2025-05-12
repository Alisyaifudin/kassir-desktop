import { ChevronLeft, ChevronRight } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import {  formatDate, getDayName, } from "~/lib/utils";

export function DatePickerCrowd({ setTime, time }: { time: number; setTime: (time: number) => void }) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz).startOfDay();
	const handlePrev = () => {
		setTime(date.subtract(Temporal.Duration.from({ days: 1 })).epochMilliseconds);
	};
	const handleNext = () => {
		setTime(date.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds);
	};
	return (
		<div className="flex items-center gap-7">
			<div className="flex items-center gap-2">
				<Button onClick={handlePrev}>
					<ChevronLeft />
				</Button>
				<Calendar time={time} setTime={setTime} mode={"day"}>
					<p className="text-2xl px-5 font-normal">
						{getDayName(time)}, {formatDate(time, "long")}
					</p>
				</Calendar>
				<Button onClick={handleNext}>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}

