import { useDB } from "~/RootLayout";
import { Await } from "~/components/Await";
import { NewBtn } from "./NewItem";
import { SetURLSearchParams, useSearchParams } from "react-router";
import { useMemo } from "react";
import { formatDate, formatTime, numeric } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { useAsyncDep } from "~/hooks/useAsyncDep";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { getDay } from "~/pages/Records/Record-Item/Detail";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DeleteBtn } from "./DeleteBtn";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Decimal from "decimal.js";

export default function Shop() {
	const [search, setSearch] = useSearchParams();
	const { start, end, time, date, kind } = useMemo(() => {
		const kind = z.enum(["saving", "debt"]).catch("saving").parse(search.get("kind"));
		const now = Temporal.Now.instant().epochMilliseconds;
		const timestamp = numeric.catch(now).parse(search.get("time"));
		const tz = Temporal.Now.timeZoneId();
		const date = Temporal.Instant.fromEpochMilliseconds(timestamp)
			.toZonedDateTimeISO(tz)
			.startOfDay();
		const start = Temporal.ZonedDateTime.from({
			timeZone: tz,
			year: date.year,
			month: date.month,
			day: 1,
		});
		const end = start.add(Temporal.Duration.from({ months: 1 }));
		return {
			kind,
			time: timestamp,
			date,
			start: start.epochMilliseconds,
			end: end.epochMilliseconds,
		};
	}, [search]);
	const state = useMoney(time, start, end);
	const setTime = (time: number) => {
		setSearch({ time: time.toString(), kind });
	};
	const handleNext = () => {
		const time = date.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds;
		setSearch({ time: time.toString(), kind });
	};
	const handlePrev = () => {
		const time = date.subtract(Temporal.Duration.from({ months: 1 })).epochMilliseconds;
		setSearch({ time: time.toString(), kind });
	};
	const setChangeMode = (mode: string) => {
		const kind = z.enum(["saving", "debt"]).catch("saving").parse(mode);
		setSearch({
			kind,
			time: time.toString(),
		});
	};
	return (
		<div className="flex flex-col gap-2 w-full flex-1 overflow-auto">
			<h1 className="text-4xl font-bold">Catatan Keuangan</h1>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={handlePrev}>
						<ChevronLeft />
					</Button>
					<Calendar mode="month" time={time} setTime={setTime} />
					<Button variant="outline" onClick={handleNext}>
						<ChevronRight />
					</Button>
				</div>
				<NewBtn setSearch={setSearch} kind={kind} />
			</div>
			<Await state={state}>
				{(money) => {
					return (
						<Tabs value={kind} onValueChange={setChangeMode} className="overflow-auto flex-1">
							<TabsList>
								<TabsTrigger value="saving">Simpanan</TabsTrigger>
								<TabsTrigger value="debt">Utang</TabsTrigger>
							</TabsList>
							<TabsContent value="saving">
								<TableList money={money} kind="saving" setSearch={setSearch} />
							</TabsContent>
							<TabsContent value="debt">
								<TableList money={money} kind="debt" setSearch={setSearch} />
							</TabsContent>
						</Tabs>
					);
					return;
				}}
			</Await>
		</div>
	);
}

function useMoney(time: number, start: number, end: number) {
	const db = useDB();
	const state = useAsyncDep(() => db.money.get(start, end), [start, end, time]);
	return state;
}

function TableList({
	money,
	kind,
	setSearch,
}: {
	money: DB.Money[];
	kind: "saving" | "debt";
	setSearch: SetURLSearchParams;
}) {
	const vals = money.filter((m) => m.kind === kind);
	return (
		<Table className="text-3xl">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">No</TableHead>
					<TableHead>Hari</TableHead>
					<TableHead>Tanggal</TableHead>
					<TableHead>Waktu</TableHead>
					<TableHead className="text-right">Selisih</TableHead>
					<TableHead className="text-right">Nilai</TableHead>
					<TableHead className="text-right"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{vals.map((m, i) => (
					<TableRow key={m.timestamp}>
						<TableCell className="font-medium">{i + 1}</TableCell>
						<TableCell>{getDay(m.timestamp).name}</TableCell>
						<TableCell>{formatDate(m.timestamp, "long")}</TableCell>
						<TableCell>{formatTime(m.timestamp, "long")}</TableCell>
						<TableCell className="text-right">
							{i + 1 < vals.length
								? `Rp${new Decimal(m.value)
										.sub(vals[i + 1].value)
										.toNumber()
										.toLocaleString("id-ID")}`
								: "-"}
						</TableCell>
						<TableCell className="text-right">Rp{m.value.toLocaleString("id-ID")}</TableCell>
						<TableCell>
							<DeleteBtn money={m} setSearch={setSearch} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
