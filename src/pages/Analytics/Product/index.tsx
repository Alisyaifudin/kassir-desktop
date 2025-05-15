import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { ProductRecord } from "~/database/product";
import { useProductSearch } from "./useProductSearch";
import { DatePicker } from "../DatePicker";
import { SetURLSearchParams } from "react-router";
import { Mode } from "../Mode";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";

export function Product({
	products: all,
	mode,
	handleClickInterval,
	handleTime,
	time,
	setSearch,
	interval,
}: {
	products: ProductRecord[];
	mode: "sell" | "buy";
	start: number;
	end: number;
	handleClickInterval: (val: string) => void;
	handleTime: (time: number) => void;
	time: number;
	setSearch: SetURLSearchParams;
	interval: "daily" | "weekly" | "monthly" | "yearly";
}) {
	const [query, setQuery] = useState("");
	const [q, setQ] = useState("");
	const products = useProductSearch(all, mode, q);
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.currentTarget.value);
		debounced(e.currentTarget.value);
	};
	const debounced = useDebouncedCallback((value: string) => {
		setQ(value);
	}, 500);
	const handleMode = (mode: "buy" | "sell") => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("mode", mode);
			return search;
		});
	};

	return (
		<div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
			<div className="flex items-center gap-5">
				<DatePicker
					handleClickInterval={handleClickInterval}
					setTime={handleTime}
					time={time}
					option={"products"}
					interval={interval}
				/>
				<Mode mode={mode} setMode={handleMode} />
				<Input type="search" placeholder="Cari..." value={query} onChange={handleChange} />
			</div>
			<Table className="overflow-auto text-3xl">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[60px]">No</TableHead>
						<TableHead className="w-[150px]">Barcode</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="text-end w-[140px]">Harga</TableHead>
						<TableHead className="text-end w-[140px]">Modal</TableHead>
						<TableHead className="w-[100px]">Jumlah</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{products.map((product, i) => (
						<TableRow key={i}>
							<TableCell className="font-medium">{i + 1}</TableCell>
							<TableCell>{product.barcode ?? ""}</TableCell>
							<TableCell>{product.name}</TableCell>
							<TableCell className="text-end">{product.price.toLocaleString("id-ID")}</TableCell>
							<TableCell className="text-end">{product.capital.toLocaleString("id-ID")}</TableCell>
							<TableCell className="text-end">{product.qty}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
