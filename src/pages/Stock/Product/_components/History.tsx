import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ProductHistory } from "~/database/product";
import { useEffect } from "react";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Loading, TableList } from "./HistoryList";
import { LIMIT, useHistory } from "../_hooks/use-history";
import { Async } from "~/components/Async";
import { Database } from "~/database";
import { SetURLSearchParams } from "react-router";
import { usePage } from "../_hooks/usePage";
import { useMode } from "../_hooks/useMode";

export function History({
	id,
	db,
	search,
	setSearch,
}: {
	id: number;
	search: URLSearchParams;
	setSearch: SetURLSearchParams;
	db: Database;
}) {
	const [page, setPage] = usePage(search, setSearch);
	const [mode, setMode] = useMode(search, setSearch);
	const state = useHistory(id, page, mode, db);
	return (
		<Async state={state} Loading={<Loading />}>
			{({ products, total }) => {
				return (
					<HistoryComp
						mode={mode}
						handleChange={setMode}
						id={id}
						products={products}
						handleChangePage={setPage}
						total={total}
						page={page}
					/>
				);
			}}
		</Async>
	);
}

function HistoryComp({
	products,
	id,
	page,
	total,
	handleChangePage,
	mode,
	handleChange,
}: {
	products: ProductHistory[];
	page: number;
	total: number;
	id: number;
	mode: "buy" | "sell";
	handleChange: (mode: "buy" | "sell") => void;
	handleChangePage: (page: number) => void;
}) {
	const totalPage = Math.ceil(total / LIMIT);
	useEffect(() => {
		if (page > totalPage) {
			handleChangePage(totalPage);
		}
	}, [page, totalPage]);
	const handlePrev = () => {
		const newPage = page > 0 ? page - 1 : 1;
		handleChangePage(newPage);
	};
	const handleNext = () => {
		const newPage = page < totalPage ? page + 1 : totalPage;
		handleChangePage(newPage);
	};
	return (
		<div className="flex flex-col gap-2 w-full p-1 overflow-auto h-full">
			<div className="flex items-center justify-between">
				<RadioGroup
					value={mode}
					className="flex items-center gap-5"
					onValueChange={(v) => {
						const parsed = z.enum(["sell", "buy"]).safeParse(v);
						handleChange(parsed.success ? parsed.data : "sell");
					}}
				>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="sell" id="sell" />
						<Label htmlFor="sell" className="text-3xl">
							Jual
						</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="buy" id="buy" />
						<Label htmlFor="buy" className="text-3xl">
							Beli
						</Label>
					</div>
				</RadioGroup>
				<div className="flex gap-5 items-center">
					<Button onClick={handlePrev} disabled={page === 1}>
						<ChevronLeft size={35} />
					</Button>
					<p className="text-3xl">
						{page}/{totalPage}
					</p>
					<Button onClick={handleNext} disabled={page === totalPage || totalPage === 0}>
						<ChevronRight size={35} />
					</Button>
				</div>
			</div>
			<TableList products={products} mode={mode} id={id} />
		</div>
	);
}
