import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { ProductHistory } from "~/database/product";
import { dayNames, formatTime } from "~/lib/utils";

export function History({
	history,
	time,
	setTime,
	id,
}: {
	history: ProductHistory[];
	time: number;
	setTime: (time: number) => void;
	id: number;
}) {
	const urlBack = encodeURIComponent(`/stock/${id}`);
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
	const handlePrev = () => {
		setTime(date.subtract(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
	};
	const handleNext = () => {
		setTime(date.add(Temporal.Duration.from({ months: 1 })).epochMilliseconds);
	};
	return (
		<div className="flex flex-col gap-2 w-[1000px] p-1">
			<div className="flex items-center justify-between">
				<p className="text-3xl font-bold">Riwayat</p>
				<div className="flex gap-2 items-center">
					<Button onClick={handlePrev}>
						<ChevronLeft size={35} />
					</Button>
					<Calendar mode="month" time={time} setTime={setTime} className="w-fit" />
					<Button onClick={handleNext}>
						<ChevronRight size={35} />
					</Button>
				</div>
			</div>
			<Table className="text-3xl w-fit">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[100px]">No</TableHead>
						<TableHead className="w-[200px]">Tanggal</TableHead>
						<TableHead className="w-[100px]">Waktu</TableHead>
						<TableHead className="w-[150px]">Jumlah</TableHead>
						<TableHead className="w-[100px]">Tipe</TableHead>
						<TableHead className="w-[50px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{history.map((r, i) => {
						const { name, day } = getDay(r.timestamp);
						return (
							<TableRow key={r.timestamp}>
								<TableCell className="font-medium">{i + 1}</TableCell>
								<TableCell>
									{day} {name}
								</TableCell>
								<TableCell>{formatTime(r.timestamp, "long")}</TableCell>
								<TableCell className="text-center">{r.qty}</TableCell>
								<TableCell>{title[r.mode]}</TableCell>
								<TableCell>
									<Link
										to={{ pathname: `/records/${r.timestamp}`, search: `?url_back=${urlBack}` }}
									>
										<ExternalLink size={35} />
									</Link>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

const title = {
	sell: "Jual",
	buy: "Beli",
} as const;

export function getDay(epochMilli: number) {
	const tz = Temporal.Now.timeZoneId();
	const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
	return { day: date.day, name: dayNames[date.dayOfWeek] };
}
