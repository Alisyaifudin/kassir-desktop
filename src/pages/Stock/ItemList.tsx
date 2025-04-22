import { Pencil } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Link } from "react-router";

type ItemListProps = {
	items: {
		id: number;
		barcode: string | null;
		name: string;
		price: string;
		stock: number;
	}[];
};

export function ItemList({ items }: ItemListProps) {
	console.log({ items });
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50px]">No</TableHead>
					<TableHead className="w-[200px]">Barcode</TableHead>
					<TableHead>Nama</TableHead>
					<TableHead className="text-right w-[100px]">Harga</TableHead>
					<TableHead className="text-right w-[50px]">Stok</TableHead>
					<TableHead className="w-[50px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item, i) => (
					<TableRow key={i}>
						<TableCell>{i + 1}</TableCell>
						<TableCell>{item.barcode ?? ""}</TableCell>
						<TableCell>{item.name}</TableCell>
						<TableCell className="text-right">
							{Number(item.price).toLocaleString("de-DE")}
						</TableCell>
						<TableCell className="text-right">{item.stock}</TableCell>
						<TableCell>
							<Button variant="link" className="p-0" asChild>
								<Link to={`/items/${item.id}`}>
									<Pencil />
								</Link>
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
