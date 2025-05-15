import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link, SetURLSearchParams } from "react-router";
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
import { formatDate, formatTime } from "~/lib/utils";
import { LIMIT } from "./Product";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";

export function History({
	products,
	id,
	setSearch,
	page,
	total,
	search,
}: {
	products: ProductHistory[];
	page: number;
	total: number;
	id: number;
	setSearch: SetURLSearchParams;
	search: URLSearchParams;
}) {
	const urlBack = encodeURIComponent(`/stock/${id}`);
	const totalPage = Math.ceil(total / LIMIT);
	useEffect(() => {
		if (page > totalPage) {
			setSearch((prev) => {
				const search = new URLSearchParams(prev);
				search.set("page", "1");
				return search;
			});
		}
	}, []);
	const mode = useMemo(() => {
		const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
		const mode = parsed.data ? parsed.data : "sell";
		return mode;
	}, [search]);
	const handlePrev = () => {
		setSearch((prev) => {
			const newPage = page > 0 ? page - 1 : 1;
			const search = new URLSearchParams(prev);
			search.set("page", newPage.toString());
			return search;
		});
	};
	const handleNext = () => {
		setSearch((prev) => {
			const newPage = page < totalPage ? page + 1 : totalPage;
			const search = new URLSearchParams(prev);
			search.set("page", newPage.toString());
			return search;
		});
	};
	const setMode = (mode: "buy" | "sell") => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("mode", mode);
			return search;
		});
	};
	return (
		<div className="flex flex-col gap-2 w-[1000px] p-1">
			<div className="flex items-center justify-between">
				<p className="text-3xl font-bold">Riwayat</p>
				{totalPage > 0 ? (
					<div className="flex gap-5 items-center">
						<RadioGroup
							value={mode}
							className="flex items-center gap-5"
							onValueChange={(v) => {
								const parsed = z.enum(["sell", "buy"]).safeParse(v);
								setMode(parsed.success ? parsed.data : "sell");
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
						<Button onClick={handlePrev} disabled={page === 1}>
							<ChevronLeft size={35} />
						</Button>
						<p className="text-3xl">
							{page}/{totalPage}
						</p>
						<Button onClick={handleNext} disabled={page === totalPage}>
							<ChevronRight size={35} />
						</Button>
					</div>
				) : null}
			</div>
			<Table className="text-3xl w-fit">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[60px]">No</TableHead>
						<TableHead className="w-[200px]">Tanggal</TableHead>
						<TableHead className="w-[200px]">Waktu</TableHead>
						<TableHead className="w-[150px]">Jumlah</TableHead>
						<TableHead className="w-[50px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{products
						.filter((p) => p.mode === mode)
						.map((r, i) => (
							<TableRow key={r.timestamp}>
								<TableCell className="font-medium">{i + 1}</TableCell>
								<TableCell>{formatDate(r.timestamp).replace(/-/g, "/")}</TableCell>
								<TableCell>{formatTime(r.timestamp, "long")}</TableCell>
								<TableCell className="text-center">{r.qty}</TableCell>
								<TableCell>
									<Link
										to={{ pathname: `/records/${r.timestamp}`, search: `?url_back=${urlBack}` }}
									>
										<ExternalLink size={35} />
									</Link>
								</TableCell>
							</TableRow>
						))}
				</TableBody>
			</Table>
		</div>
	);
}
