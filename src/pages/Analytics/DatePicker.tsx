import { ChevronLeft, ChevronRight } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { dayNames, formatDate, getDayName, monthNames } from "~/lib/utils";


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
	option: "cashflow" | "profit" | "crowd" | "products";
}) {
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
		<div className="flex items-center gap-7">
			<RadioGroup
				value={interval}
				className="flex items-center gap-5"
				onValueChange={handleClickInterval}
			>
				{option === "products" ? (
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="daily" id="daily" />
						<Label htmlFor="daily" className="text-3xl">
							Hari
						</Label>
					</div>
				) : null}
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="weekly" id="weekly" />
					<Label htmlFor="weekly" className="text-3xl">
						Minggu
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="monthly" id="monthly" />
					<Label htmlFor="monthly" className="text-3xl">
						Bulan
					</Label>
				</div>
				{option === "products" ? null : (
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="yearly" id="yearly" />
						<Label htmlFor="yearly" className="text-3xl">
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
