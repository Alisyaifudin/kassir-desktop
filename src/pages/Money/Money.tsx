import { NewBtn } from "./_components/NewItem";
import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "~/components/Calendar";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useInterval } from "./_hooks/use-interval";
import { useMoney } from "./_hooks/use-money";
import { TableList } from "./_components/TableList";
import { Database } from "~/database";
import { Async } from "~/components/Async";

export default function Page({ db }: { db: Database }) {
	const [search, setSearch] = useSearchParams();
	const { time, start, end, kind, date } = useInterval(search);
	const [state, revalidate] = useMoney(time, start, end, db);
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
		<main className="flex flex-col gap-2 w-full max-w-6xl mx-auto flex-1 overflow-auto">
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
				<NewBtn key={kind} setSearch={setSearch} kind={kind} db={db} revalidate={revalidate} />
			</div>
			<Async state={state}>
				{(money) => {
					return (
						<Tabs value={kind} onValueChange={setChangeMode} className="overflow-auto flex-1">
							<TabsList>
								<TabsTrigger className="text-3xl" value="saving">
									Simpanan
								</TabsTrigger>
								<TabsTrigger className="text-3xl" value="debt">
									Utang
								</TabsTrigger>
								<TabsTrigger className="text-3xl" value="diff">
									Selisih
								</TabsTrigger>
							</TabsList>
							<TabsContent value="saving">
								<TableList
									money={money}
									kind="saving"
									setSearch={setSearch}
									db={db}
									revalidate={revalidate}
								/>
							</TabsContent>
							<TabsContent value="debt">
								<TableList
									money={money}
									kind="debt"
									setSearch={setSearch}
									db={db}
									revalidate={revalidate}
								/>
							</TabsContent>
							<TabsContent value="diff">
								<TableList
									money={money}
									kind="diff"
									setSearch={setSearch}
									db={db}
									revalidate={revalidate}
								/>
							</TabsContent>
						</Tabs>
					);
					return;
				}}
			</Async>
		</main>
	);
}
