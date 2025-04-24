import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Temporal } from "temporal-polyfill";
import { formatDate, formatTime } from "../../../utils";
import { Item } from "./Item";
import Decimal from "decimal.js";
import { useSetting } from "../../Setting/setting-api";
import { Await } from "../../../components/Await";
export function ItemList({ items, record }: { record: DB.Record; items: DB.RecordItem[] }) {
	const styleRef = useRef<HTMLStyleElement | null>(null);
	const info = useInfo();
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
	const today = Temporal.Now.instant().epochMilliseconds;
	const disc = calcDisc(record.disc_type, record.disc_val, record.total);
	return (
		<div className="flex flex-col gap-5">
			<Await state={info}>
				{(data) => (
					<div id="print-container" className="flex flex-col gap-2 overflow-auto text-xs">
						<div className="flex flex-col">
							<p className="text-center font-bold">{data.owner}</p>
							<p className="text-center">{data.desc}</p>
							<p className="text-end">{data.address}</p>
							<p className="text-end">
								{formatDate(today, "short").replace(/-/g, "/")}, {formatTime(today)}
							</p>
						</div>
						<hr />
						{items.map((item, i) => (
							<Item {...item} i={i} />
						))}
						<hr />
						<div className="flex justify-end">
							<div className="flex flex-col items-end">
								{record.disc_val > 0 ? (
									<>
										<div className="grid grid-cols-[100px_90px]">
											<p>Subtotal:</p>{" "}
											<p className="text-end">
												Rp{(Number(record.total) + disc).toLocaleString("de-DE")}
											</p>
										</div>
										<div className="grid grid-cols-[100px_90px]">
											<p>Diskon:</p> <p className="text-end">Rp{disc.toLocaleString("de-DE")}</p>
										</div>
										<hr className="w-full" />
									</>
								) : null}
								<div className="grid grid-cols-[50px_90px]">
									<p>Total:</p>{" "}
									<p className="text-end">Rp{Number(record.total).toLocaleString("de-DE")}</p>
								</div>
								<div className="grid grid-cols-[50px_90px]">
									<p>Pembayaran:</p>
									<p className="text-end">Rp{Number(record.pay).toLocaleString("de-DE")}</p>
								</div>
								<hr className="w-full" />
								<div className="grid grid-cols-[50px_90px]">
									<p>Kembalian:</p>{" "}
									<p className="text-end">Rp{Number(record.change).toLocaleString("de-DE")}</p>
								</div>
							</div>
						</div>
						<div className="flex items-center flex-col">
							<p>Terimakasih telah berbelanja di toko kami</p>
							<p>Barang yang sudah dibeli tidak dapat ditukar lagi</p>
							<p>IG: {data.ig}</p>
							<p>Shopee: {data.shopee}</p>
						</div>
					</div>
				)}
			</Await>
			<Button className="self-end" onClick={print}>
				Cetak
			</Button>
		</div>
	);
}

function calcDisc(type: "number" | "percent", value: number, subtotal: number) {
	switch (type) {
		case "number":
			return value;
		case "percent":
			return new Decimal(subtotal).times(value).div(100).toNumber();
	}
}

function useInfo() {
	return useSetting();
}
