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
import { useInterval } from "../_hooks/use-interval";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

type Props = {
	products: DB.AdditionalItem[];
};

export function AdditionalList({ products }: Props) {
	const { start, end } = useInterval(products.length);
	const size = useSize();
	const navigate = useNavigate();
	const handleClick = (id: number) => () => {
		const backURL = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
		navigate({ pathname: `additional/${id}`, search: `?url_back=${backURL}` });
	};
	return (
		<TableScrollable style={style[size].text}>
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
				{products.slice(start, end).map((product, i) => (
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
								<SquareArrowOutUpRight size={35} />
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
