import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router";
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
import { useEffect } from "react";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";

export function History({
	products,
	id,
	page,
	total,
	handleChangePage,
	mode,
	setMode,
}: {
	products: ProductHistory[];
	page: number;
	total: number;
	id: number;
	mode: "buy" | "sell";
	setMode: (mode: "buy" | "sell") => void;
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

function TableList({
	mode,
	products,
	id,
}: {
	products: ProductHistory[];
	mode: "buy" | "sell";
	id: number;
}) {
	const urlBack = encodeURIComponent(`/stock/${id}`);
	switch (mode) {
		case "buy":
			return (
				<Table className="text-3xl w-fit">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[60px]">No</TableHead>
							<TableHead className="w-[150px]">Tanggal</TableHead>
							<TableHead className="w-[100px]">Waktu</TableHead>
							<TableHead className="w-[200px] text-center">Modal</TableHead>
							<TableHead className="w-[100px] text-center">Jumlah</TableHead>
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
									<TableCell className="text-center">{r.capital.toLocaleString("id-DE")}</TableCell>
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
			);
		case "sell":
			return (
				<Table className="text-3xl w-fit">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[60px]">No</TableHead>
							<TableHead className="w-[200px]">Tanggal</TableHead>
							<TableHead className="w-[200px]">Waktu</TableHead>
							<TableHead className="w-[200px] text-center">Jumlah</TableHead>
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
			);
	}
}

export function Loading() {
	return (
		<div className="flex flex-col gap-2 w-[1138.5px] p-1">
			<Table className="text-3xl w-fit">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[60px]">No</TableHead>
						<TableHead className="w-[200px]">Tanggal</TableHead>
						<TableHead className="w-[200px]">Waktu</TableHead>
						<TableHead className="w-[200px] text-center">Jumlah</TableHead>
						<TableHead className="w-[50px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody></TableBody>
			</Table>
		</div>
	);
}
