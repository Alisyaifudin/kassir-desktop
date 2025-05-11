import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { z } from "zod";
import { useFetchData } from "./fetch";
import { numeric } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { AwaitDangerous } from "~/components/Await";
import { TextError } from "~/components/TextError";
import { Cashflow } from "./Cashflow";
import { useEffect } from "react";
import { Profit } from "./Profit";
import { Summary } from "./Cashflow/Summary";
import { Crowd } from "./Crowd";
import { SummaryProduct } from "./Product/SummaryProducts";
import { Product } from "./Product";
import { DatePicker, DatePickerCrowd } from "./DatePicker";
import { Mode } from "./Mode";

export default function Analytics() {
	const [search, setSearch] = useSearchParams();
	const {
		option,
		interval,
		time: [time, updateTime],
		mode,
	} = getOption(search);
	const { state, start, end } = useFetchData(interval, time);
	useEffect(() => {
		handleTime(time);
	}, [updateTime]);
	const handleMode = (mode: "buy" | "sell") => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("mode", mode);
			return search;
		});
	};
	const handleClickOption = (option: "cashflow" | "profit" | "crowd" | "products") => () => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("option", option);
			switch (option) {
				case "crowd":
					search.set("interval", "weekly");
					break;
				case "products":
					if (interval === "yearly") {
						search.set("interval", "monthly");
					}
					break;
				case "profit":
				case "cashflow":
					if (interval === "daily") {
						search.set("interval", "weekly");
					}
					break;
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
		const parsed = z.enum(["daily", "weekly", "monthly", "yearly"]).safeParse(val);
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
		<main className="grid grid-cols-[300px_1fr] p-2 gap-2 flex-1 overflow-auto">
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
				<Button
					onClick={handleClickOption("products")}
					variant={option === "products" ? "default" : "link"}
				>
					Produk
				</Button>
				<hr />
				<AwaitDangerous state={state}>
					{(data) => {
						const [[errRecord, records], [errProduct, products]] = data;
						if (errRecord || errProduct) {
							return <TextError>{(errRecord || errProduct)!}</TextError>;
						}
						if (option === "products") {
							return <SummaryProduct start={start} end={end} mode={mode} products={products} />;
						}
						return (
							<Summary
								start={start}
								end={end}
								time={time}
								interval={interval === "daily" ? "weekly" : interval}
								records={records}
								option={option}
							/>
						);
					}}
				</AwaitDangerous>
			</aside>
			<div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
				{option === "crowd" ? (
					<DatePickerCrowd setTime={handleTime} time={time} />
				) : (
					<div className="flex items-center gap-5">
						<DatePicker
							handleClickInterval={handleClickInterval}
							setTime={handleTime}
							time={time}
							option={option}
							interval={interval}
						/>
						{option === "products" ? <Mode mode={mode} setMode={handleMode} /> : null}
					</div>
				)}
				<AwaitDangerous state={state}>
					{(data) => {
						const [[errRecord, records], [errProduct, products]] = data;
						if (errRecord || errProduct) {
							return <TextError>{(errRecord || errProduct)!}</TextError>;
						}
						switch (option) {
							case "products":
								return <Product products={products} mode={mode} start={start} end={end} />;
							case "cashflow":
								return (
									<Cashflow
										records={records}
										interval={interval === "daily" ? "weekly" : interval}
										start={start}
										end={end}
									/>
								);
							case "profit":
								return (
									<Profit
										records={records}
										interval={interval === "daily" ? "weekly" : interval}
										start={start}
										end={end}
									/>
								);
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
				</AwaitDangerous>
			</div>
		</main>
	);
}

function getOption(search: URLSearchParams) {
	const option_p = z
		.enum(["cashflow", "profit", "crowd", "products"])
		.safeParse(search.get("option"));
	const option = option_p.success ? option_p.data : "cashflow";
	const interval_p = z
		.enum(["daily", "weekly", "monthly", "yearly"])
		.safeParse(search.get("interval"));
	const interval = interval_p.success ? interval_p.data : "weekly";
	const tz = Temporal.Now.timeZoneId();
	const time_p = numeric.safeParse(search.get("time"));
	const time: [number, boolean] = time_p.success
		? [time_p.data, false]
		: [Temporal.Now.instant().toZonedDateTimeISO(tz).startOfDay().epochMilliseconds, true];
	const mode_p = z.enum(["buy", "sell"]).safeParse(search.get("mode"));
	const mode = mode_p.success ? mode_p.data : "sell";
	return { option, interval, time, mode };
}
