import { LoaderFunctionArgs, RouteObject, useLoaderData, useSearchParams } from "react-router";
import { useDb } from "../../Layout";
import { RecordList } from "./RecordList";
import { route as itemRoute } from "./Record-Item";
import { Temporal } from "temporal-polyfill";
import { formatDate } from "../../utils";
import { useFetch } from "../../hooks/useFetch";
import { Await } from "../../components/Await";
import { ItemList } from "./ItemList";

export const route: RouteObject = {
	path: "records",
	children: [{ index: true, Component: Page, loader }, itemRoute],
};

function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const time = getTime(url.searchParams);
	const selected = getSelected(url.searchParams);
	return { time, selected };
}

export default function Page() {
	const { time, selected } = useLoaderData<typeof loader>();
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const state = useRecords(date);
	const [_, setSearch] = useSearchParams();
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const date = e.currentTarget.value;
		const [year, month, day] = date.split("-").map(Number);
		const epoch = Temporal.ZonedDateTime.from({
			timeZone: tz,
			year,
			month,
			day,
			hour: 12,
		}).epochMilliseconds;
		setSearch((search) => ({
			...search,
			time: epoch.toString(),
		}));
	};
	const selectRecord = (id: number) => () => {
		setSearch((search) => ({
			...search,
			selected: selected === id ? null : id,
		}));
	};
	return (
		<main className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto">
			<div className="flex gap-2 items-center ">
				<input
					type="date"
					className="outline rounded-md"
					value={formatDate(time)}
					onChange={handleChange}
				/>
				<p>Tanggal {formatDate(time, "long")}</p>
			</div>
			<Await state={state}>
				{(data) => (
					<div className="grid grid-cols-[1fr_1px_3fr] gap-2 h-full overflow-y-auto">
						<RecordList records={data[0]} selectRecord={selectRecord} selected={selected} />
						<div className="border-l" />
						<ItemList allItems={data[1]} recordId={selected} records={data[0]} />
					</div>
				)}
			</Await>
		</main>
	);
}

function useRecords(date: Temporal.ZonedDateTime) {
	const db = useDb();
	const start = date.startOfDay().epochMilliseconds;
	const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
	const promises = Promise.all([
		db.select<DB.Record[]>(
			"SELECT * FROM records WHERE time BETWEEN $1 AND $2 ORDER BY time DESC",
			[start, end]
		),
		db.select<DB.RecordItem[]>(
			"SELECT * FROM record_items WHERE time BETWEEN $1 AND $2 ORDER BY time DESC",
			[start, end]
		),
	]);
	const state = useFetch(promises);
	return state;
}

function getTime(search: URLSearchParams): number {
	const timeStr = search.get("time");
	if (timeStr === null || Number.isNaN(timeStr)) {
		return Temporal.Now.instant().epochMilliseconds;
	}
	return Number(timeStr);
}

function getSelected(search: URLSearchParams): number | null {
	const selected = search.get("selected");
	if (selected === null || Number.isNaN(selected)) {
		return null;
	}
	return Number(selected);
}
