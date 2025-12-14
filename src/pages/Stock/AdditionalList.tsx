import { SquareArrowOutUpRight } from "lucide-react";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableScrollable,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { useNavigate } from "react-router";
import { useInterval } from "./use-interval";

type Props = {
	additionals: DB.AdditionalItem[];
};

export function AdditionalList({ additionals }: Props) {
	const { start, end } = useInterval(additionals.length);
	const navigate = useNavigate();
	const handleClick = (id: number) => () => {
		const backURL = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
		navigate({ pathname: `additional/${id}`, search: `?url_back=${backURL}` });
	};
	return (
		<TableScrollable className="text-normal">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50px]">No</TableHead>
					<TableHead>Nama</TableHead>
					<TableHead className="text-right w-[150px]">Jenis</TableHead>
					<TableHead className="text-right w-[200px]">Nilai Awal</TableHead>
					<TableHead className="w-[50px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{additionals.slice(start, end).map((product, i) => (
					<TableRow key={i}>
						<TableCell>{i + 1 + start}</TableCell>
						<TableCell>{product.name}</TableCell>
						<TableCell className="text-right">{label[product.kind]}</TableCell>
						<TableCell className="text-right">{product.value.toLocaleString("id-ID")}</TableCell>
						<TableCell>
							<Button
								variant="link"
								className="p-0 cursor-pointer"
								onClick={handleClick(product.id)}
							>
								<SquareArrowOutUpRight className="icon" />
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</TableScrollable>
	);
}

const label = {
	percent: "Persen",
	number: "Angka",
};
