import { SetURLSearchParams } from "react-router";
import { z } from "zod";
import { ProductRecord } from "~/database/product";
import { Product } from "../product";
import { Cashflow } from "../cashflow";
import { Profit } from "../profit";
import { Crowd } from "../crowd";
import { RecordTransform } from "~/lib/record";

type Props = {
	option: "products" | "cashflow" | "profit" | "crowd";
	setSearch: SetURLSearchParams;
	handleTime: (time: number) => void;
	time: number;
	start: number;
	end: number;
	interval: "daily" | "weekly" | "monthly" | "yearly";
	mode: "buy" | "sell";
	records: RecordTransform[];
	products: ProductRecord[];
};

export function RightPanel({
	option,
	setSearch,
	handleTime,
	products,
	records,
	time,
	interval,
	mode,
	start,
	end,
}: Props) {
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

	switch (option) {
		case "cashflow":
			return (
				<Cashflow
					time={time}
					handleClickInterval={handleClickInterval}
					handleTime={handleTime}
					records={records}
					interval={interval === "daily" ? "weekly" : interval}
					start={start}
					end={end}
				/>
			);
		case "profit":
			return (
				<Profit
					time={time}
					handleClickInterval={handleClickInterval}
					handleTime={handleTime}
					records={records}
					interval={interval === "daily" ? "weekly" : interval}
					start={start}
					end={end}
				/>
			);
		case "crowd":
			return <Crowd records={records} weekly={[start, end]} handleTime={handleTime} time={time} />;
		case "products":
			return (
				<Product
					products={products}
					mode={mode}
					start={start}
					end={end}
					handleClickInterval={handleClickInterval}
					handleTime={handleTime}
					interval={interval}
					setSearch={setSearch}
					time={time}
				/>
			);
	}
}
