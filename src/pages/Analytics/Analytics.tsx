import { SetURLSearchParams, useSearchParams } from "react-router";
import { useFetchData } from "./_hooks/use-fetch-data";
import { useCallback, useEffect } from "react";
import { Summary } from "./cashflow/Summary";
import { SummaryProduct } from "./product/SummaryProducts";
import { RightPanel } from "./_components/RightPanel";
import { getOption } from "./_utils/get-option";
import { NavLink } from "./_components/NavLink";
import { Either } from "~/components/Either";
import { Database } from "~/database";
import { Async } from "~/components/Async";

export default function Analytics({ db }: { db: Database }) {
	const [search, setSearch] = useSearchParams();
	const {
		option,
		interval,
		time: [time, updateTime],
		mode,
	} = getOption(search);
	const { state, start, end } = useFetchData(interval, time, db);
	useEffect(() => {
		handleTime(time, setSearch);
	}, [updateTime]);
	const handleClickOption = useCallback(
		(option: "cashflow" | "profit" | "crowd" | "products") =>
			handleClickOptionRaw(option, interval, setSearch),
		[interval]
	);
	return (
		<main className="grid grid-cols-[300px_1fr] p-2 gap-2 flex-1 overflow-auto">
			<Async state={state}>
				{(data) => {
					const { records, products } = data;
					return (
						<>
							<aside className="flex flex-col gap-2">
								<NavLink option="cashflow" onClick={handleClickOption} selectedOption={option}>
									Arus Kas
								</NavLink>
								<NavLink option="profit" onClick={handleClickOption} selectedOption={option}>
									Keuntungan
								</NavLink>
								<NavLink option="crowd" onClick={handleClickOption} selectedOption={option}>
									Keramaian
								</NavLink>
								<NavLink option="products" onClick={handleClickOption} selectedOption={option}>
									Produk
								</NavLink>
								<hr />
								<Either
									if={option === "products"}
									then={<SummaryProduct start={start} end={end} mode={mode} products={products} />}
									else={
										<Summary
											start={start}
											end={end}
											time={time}
											interval={interval === "daily" ? "weekly" : interval}
											records={records}
											option={option as any}
										/>
									}
								/>
							</aside>
							<RightPanel
								end={end}
								start={start}
								handleTime={(time) => handleTime(time, setSearch)}
								time={time}
								interval={interval}
								mode={mode}
								option={option}
								products={products}
								records={records}
								setSearch={setSearch}
							/>
						</>
					);
				}}
			</Async>
		</main>
	);
}

function handleClickOptionRaw(
	option: "cashflow" | "profit" | "crowd" | "products",
	interval: "daily" | "weekly" | "monthly" | "yearly",
	setSearch: SetURLSearchParams
) {
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
}
const handleTime = (time: number, setSearch: SetURLSearchParams) => {
	setSearch((prev) => {
		const search = new URLSearchParams(prev);
		search.set("time", time.toString());
		return search;
	});
};
