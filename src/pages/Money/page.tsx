import { useLoaderData, useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useInterval } from "./use-interval";
import { TableList } from "./TableList";
import { Loader } from "./loader";
import { cn, sizeClass } from "~/lib/utils";
import { NewItem } from "./NewItem";
import { TableListDebt } from "./TableListDebt";

export default function Page() {
	const { money, size } = useLoaderData<Loader>();
	const [search, setSearch] = useSearchParams();
	const { time, kind, date } = useInterval(search);
	// const [state, revalidate] = useMoney(time, start, end, db);
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
		const kind = z.enum(["saving", "debt", "diff"]).catch("saving").parse(mode);
		setSearch({
			kind,
			time: time.toString(),
		});
	};
	return (
		<main
			className={cn(
				"flex flex-col gap-2 w-full max-w-7xl px-0.5 mx-auto flex-1 overflow-hidden",
				sizeClass[size]
			)}
		>
			<h1 className="text-big font-bold">Catatan Keuangan</h1>
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
				<NewItem key={kind} kind={kind} />
			</div>
			<Tabs value={kind} onValueChange={setChangeMode} className="overflow-hidden flex-1 pb-12">
				<TabsList className="text-normal">
					<TabsTrigger value="saving">Simpanan</TabsTrigger>
					<TabsTrigger value="debt">Utang</TabsTrigger>
					<TabsTrigger value="diff">Selisih</TabsTrigger>
				</TabsList>
				<TabsContent value="saving" className="overflow-auto h-full">
					<TableList money={money.saving} />
				</TabsContent>
				<TabsContent value="debt" className="overflow-auto h-full">
					<TableListDebt money={money.debt} />
				</TabsContent>
				<TabsContent value="diff" className="overflow-auto h-full">
					<TableList money={money.diff} />
				</TabsContent>
			</Tabs>
		</main>
	);
}
