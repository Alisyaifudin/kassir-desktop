import { ChevronLeft, ChevronRight } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";
import { dayNames, formatDate, monthNames } from "~/lib/utils";

const mode = {
	daily: "day",
	weekly: "day",
	monthly: "month",
	yearly: "year",
} as const;

export function DatePicker({
	interval,
	setTime,
	time,
	handleClickInterval,
	option,
}: {
	interval: "daily" | "weekly" | "monthly" | "yearly";
	time: number;
	setTime: (time: number) => void;
	handleClickInterval: (val: string) => void;
	option: "cashflow" | "net" | "crowd" | "products";
}) {
	const size = useSize();
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz).startOfDay();
	const handlePrev = () => {
		switch (interval) {
			case "daily":
				setTime(date.subtract(Temporal.Duration.from({ days: 1 })).epochMilliseconds);
				break;
			case "weekly":
				setTime(date.subtract(Temporal.Duration.from({ weeks: 1 })).epochMilliseconds);
				break;
			case "monthly":
				setTime(date.subtract(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
				break;
			case "yearly":
				setTime(date.subtract(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
				break;
		}
	};
	const handleNext = () => {
		switch (interval) {
			case "daily":
				setTime(date.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds);
				break;
			case "weekly":
				setTime(date.add(Temporal.Duration.from({ weeks: 1 })).epochMilliseconds);
				break;
			case "monthly":
				setTime(date.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
				break;
			case "yearly":
				setTime(date.add(Temporal.Duration.from({ years: 1 })).epochMilliseconds);
				break;
		}
	};
	return (
		<div style={style[size].text} className="flex items-center gap-7">
			<RadioGroup
				value={interval}
				className="flex items-center gap-5"
				onValueChange={handleClickInterval}
			>
				{option === "products" ? (
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="daily" id="daily" />
						<Label htmlFor="daily">
							Hari
						</Label>
					</div>
				) : null}
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="weekly" id="weekly" />
					<Label htmlFor="weekly">
						Minggu
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="monthly" id="monthly" />
					<Label htmlFor="monthly">
						Bulan
					</Label>
				</div>
				{option === "products" ? null : (
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="yearly" id="yearly" />
						<Label htmlFor="yearly">
							Tahun
						</Label>
					</div>
				)}
			</RadioGroup>
			<div className="flex items-center gap-2">
				<Button onClick={handlePrev}>
					<ChevronLeft />
				</Button>
				<Calendar time={time} setTime={setTime} mode={mode[interval]}>
					<CalendarLabel time={time} interval={interval} />
				</Calendar>
				<Button onClick={handleNext}>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}

function CalendarLabel({
	time,
	interval,
}: {
	time: number;
	interval: "daily" | "weekly" | "monthly" | "yearly";
}) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	switch (interval) {
		case "daily": {
			return (
				<p className="font-normal">
					{formatDate(date.epochMilliseconds).replace(/-/g, "/")} {dayNames[date.dayOfWeek]}
				</p>
			);
		}
		case "weekly": {
			const start = date.subtract(Temporal.Duration.from({ days: date.dayOfWeek - 1 }));
			const end = date.add(Temporal.Duration.from({ days: 7 - date.dayOfWeek }));
			return (
				<p className="font-normal">
					{formatDate(start.epochMilliseconds).replace(/-/g, "/")} &ndash;{" "}
					{formatDate(end.epochMilliseconds).replace(/-/g, "/")}
				</p>
			);
		}
		case "monthly":
			return (
				<p className="font-normal">
					{monthNames[date.month]} {date.year}
				</p>
			);
		case "yearly":
			return <p className="font-normal">{date.year}</p>;
	}
}
