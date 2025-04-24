import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../components/ui/table";
export function ItemList({ items, record }: { record: DB.Record; items: DB.RecordItem[] }) {
	const styleRef = useRef<HTMLStyleElement | null>(null);

	const [width] = useState(72);
	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = `
      @media print {
        @page {
          size: var(--paper-width)mm auto;
          margin: 10mm;
        }
        body {
          visibility: hidden;
        }
        #print-container {
          visibility: visible;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `;
		document.head.appendChild(style);
		styleRef.current = style;

		return () => {
			if (styleRef.current) {
				document.head.removeChild(styleRef.current);
				styleRef.current = null;
			}
		};
	}, []);

	const print = () => {
		document.documentElement.style.setProperty("--paper-width", `${width}`);
		window.print();
	};
	return (
		<div id="print-container" className="flex flex-col gap-2 overflow-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">No</TableHead>
						<TableHead>Nama</TableHead>
						<TableHead className="w-[100px]">Total</TableHead>
						{record.mode === "buy" ? <TableHead className="w-[100px]">Modal</TableHead> : null}
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item, i) => (
						<TableRow key={i}>
							<TableCell>{i + 1}</TableCell>
							<TableCell>{item.name ?? ""}</TableCell>
							<TableCell>{item.subtotal}</TableCell>
							{record.mode === "buy" ? <TableHead>{item.capital}</TableHead> : null}
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="flex gap-2 flex-col items-end">
				<div className="grid grid-cols-[100px_100px]">
					<p>Total:</p> <p className="text-end">Rp{Number(record.total).toLocaleString("de-DE")}</p>
				</div>
				<div className="grid grid-cols-[100px_100px]">
					<p>Pembayaran:</p>{" "}
					<p className="text-end">Rp{Number(record.pay).toLocaleString("de-DE")}</p>
				</div>
				<div className="grid grid-cols-[100px_100px]">
					<p>Kembalian:</p>{" "}
					<p className="text-end">Rp{Number(record.change).toLocaleString("de-DE")}</p>
				</div>
			</div>
			<Button onClick={print}>Cetak</Button>
		</div>
	);
}
