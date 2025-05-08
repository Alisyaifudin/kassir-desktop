import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { useFetchData } from "./fetch";
import { formatDate, getDayName, monthNames, numeric } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { Await } from "~/components/Await";
import { TextError } from "~/components/TextError";
import { Cashflow } from "./Cashflow";
import { useEffect } from "react";
import { Calendar } from "~/components/Calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Profit } from "./Profit";
import { Summary } from "./Summary";
import { Crowd } from "./Crowd";

const mode = {
	weekly: "day",
	monthly: "month",
	yearly: "year",
} as const;

export default function Analytics() {
	const [search, setSearch] = useSearchParams();
	const {
		option,
		interval,
		time: [time, updateTime],
	} = getOption(search);
	const { state, start, end } = useFetchData(interval, time);
	useEffect(() => {
		handleTime(time);
	}, [updateTime]);
	const handleClickOption = (option: "cashflow" | "profit" | "crowd") => () => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("option", option);
			if (option === "crowd") {
				search.set("interval", "weekly");
			}
			return search;
		});
	};
	const handleTime = (time: number) => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("time", time.toString());
			return search;
		});
	};
	const handleClickInterval = (val: string) => {
		const parsed = z.enum(["weekly", "monthly", "yearly"]).safeParse(val);
		if (!parsed.success) {
			return;
		}
		const interval = parsed.data;
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("interval", interval);
			return search;
		});
	};

	return (
		<main className="grid grid-cols-[300px_1fr] p-2 gap-2 flex-1">
			<aside className="flex flex-col gap-2">
				<Button
					onClick={handleClickOption("cashflow")}
					variant={option === "cashflow" ? "default" : "link"}
				>
					Arus Kas
				</Button>
				<Button
					onClick={handleClickOption("profit")}
					variant={option === "profit" ? "default" : "link"}
				>
					Keuntungan
				</Button>
				<Button
					onClick={handleClickOption("crowd")}
					variant={option === "crowd" ? "default" : "link"}
				>
					Keramaian
				</Button>
				<hr />
				<Await state={state}>
					{(data) => {
						const [errMsg, records] = data;
						if (errMsg) {
							return <TextError>{errMsg}</TextError>;
						}
						return (
							<Summary
								start={start}
								end={end}
								time={time}
								interval={interval}
								records={records}
								option={option}
							/>
						);
					}}
				</Await>
			</aside>
			<div className="flex flex-col gap-2 w-full h-full">
				{option === "crowd" ? (
					<DatePickerCrowd setTime={handleTime} time={time} />
				) : (
					<DatePicker
						handleClickInterval={handleClickInterval}
						setTime={handleTime}
						time={time}
						interval={interval}
					/>
				)}
				<Await state={state}>
					{(data) => {
						const [errMsg, records] = data;
						if (errMsg) {
							return <TextError>{errMsg}</TextError>;
						}
						switch (option) {
							case "cashflow":
								return <Cashflow records={records} interval={interval} start={start} end={end} />;
							case "profit":
								return <Profit records={records} interval={interval} start={start} end={end} />;
							case "crowd":
								const tz = Temporal.Now.timeZoneId();
								const startOfDay = Temporal.Instant.fromEpochMilliseconds(time)
									.toZonedDateTimeISO(tz)
									.startOfDay();
								const endOfDay = startOfDay.add(Temporal.Duration.from({ days: 1 }));
								return (
									<Crowd
										records={records}
										daily={[startOfDay.epochMilliseconds, endOfDay.epochMilliseconds]}
										weekly={[start, end]}
									/>
								);
						}
					}}
				</Await>
			</div>
		</main>
	);
}

function DatePicker({
	interval,
	setTime,
	time,
	handleClickInterval,
}: {
	interval: "weekly" | "monthly" | "yearly";
	time: number;
	setTime: (time: number) => void;
	handleClickInterval: (val: string) => void;
}) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz).startOfDay();
	const handlePrev = () => {
		switch (interval) {
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
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="yearly" id="yearly" />
					<Label htmlFor="yearly" className="text-3xl">
						Tahun
					</Label>
				</div>
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

function DatePickerCrowd({ setTime, time }: { time: number; setTime: (time: number) => void }) {
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

function getOption(search: URLSearchParams) {
	const option_p = z.enum(["cashflow", "profit", "crowd"]).safeParse(search.get("option"));
	const option = option_p.success ? option_p.data : "cashflow";
	const interval_p = z.enum(["weekly", "monthly", "yearly"]).safeParse(search.get("interval"));
	const interval = interval_p.success ? interval_p.data : "weekly";
	const tz = Temporal.Now.timeZoneId();
	const time_p = numeric.safeParse(search.get("time"));
	const time: [number, boolean] = time_p.success
		? [time_p.data, false]
		: [Temporal.Now.instant().toZonedDateTimeISO(tz).startOfDay().epochMilliseconds, true];
	return { option, interval, time };
}

function CalendarLabel({
	time,
	interval,
}: {
	time: number;
	interval: "weekly" | "monthly" | "yearly";
}) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	switch (interval) {
		case "weekly":
			const start = date.subtract(Temporal.Duration.from({ days: date.dayOfWeek - 1 }));
			const end = date.add(Temporal.Duration.from({ days: 7 - date.dayOfWeek }));
			return (
				<p className="font-normal">
					{formatDate(start.epochMilliseconds).replace(/-/g, "/")} &ndash;{" "}
					{formatDate(end.epochMilliseconds).replace(/-/g, "/")}
				</p>
			);
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
