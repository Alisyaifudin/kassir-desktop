import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
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

export function TableList({
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
