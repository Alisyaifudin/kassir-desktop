import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Temporal } from "temporal-polyfill";
import { formatDate, formatTime } from "~/lib/utils";
import { Item } from "./Item";
import { useProfile } from "~/pages/Setting/Shop/setting-api";
import { AwaitDangerous } from "~/components/Await";
import { TaxItem } from "./TaxItem";

const title = {
	buy: "Beli",
	sell: "Jual",
};

const meth = {
	cash: "Tunai",
	transfer: "Transfer",
	other: "Lainnya",
};

export function ItemList({
	items,
	record,
	additionals,
	discs,
}: {
	record: DB.Record;
	items: DB.RecordItem[];
	discs: DB.Discount[];
	additionals: DB.Additional[];
}) {
	const styleRef = useRef<HTMLStyleElement | null>(null);
	const info = useProfile();
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
	if (items.length === 0) {
		return null;
	}
	const print = () => {
		document.documentElement.style.setProperty("--paper-width", `${width}`);
		window.print();
	};
	const today = Temporal.Now.instant().epochMilliseconds;
	return (
		<div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
			<div className="flex justify-between items-center">
				<div className="flex items-center gap-2">
					<h2 className="font-bold  px-2 rounded-md text-3xl">{title[record.mode]}</h2>
					{record.mode === "buy" ? (
						record.credit === 0 ? (
							<p className="text-2xl text-emerald-500">: Lunas</p>
						) : (
							<p className="text-2xl text-red-500">: Kredit</p>
						)
					) : null}
				</div>
				<Button onClick={print}>Cetak</Button>
			</div>
			<AwaitDangerous state={info}>
				{(data) => {
					const headers = data.header === undefined ? [] : data.header.split("\n");
					const footers = data.footer === undefined ? [] : data.footer.split("\n");
					return (
						<div className="border pt-5">
							<div id="print-container" className="flex flex-col gap-2 overflow-auto px-2">
								<div className="flex flex-col">
									<p className="text-center text-lg font-bold">{data.owner}</p>
									{headers.map((h, i) => (
										<p key={i} className="text-center">
											{h}
										</p>
									))}
									<p>{data.address}</p>
									{record.cashier ? <p>Kasir: {record.cashier}</p> : null}
									<div className="flex items-center justify-between">
										<p>No: {record.timestamp}</p>
										<p>
											{formatDate(today, "short").replace(/-/g, "/")}, {formatTime(today)}
										</p>
									</div>
								</div>
								<hr />
								{items.map((item, i) => (
									<Item
										{...item}
										i={i}
										key={i}
										discs={discs.filter((disc) => disc.record_item_id === item.id)}
									/>
								))}
								<hr />
								<div className="flex justify-end">
									<div className="flex flex-col items-end">
										{record.disc_val > 0 ? (
											<>
												<div className="grid grid-cols-[100px_100px]">
													<p>Subtotal</p>{" "}
													<p className="text-end">
														Rp{record.total_before_disc.toLocaleString("id-ID")}
													</p>
												</div>
												<div className="grid grid-cols-[100px_100px]">
													<p>Diskon</p>{" "}
													<p className="text-end">
														Rp
														{(record.total_before_disc - record.total_after_disc).toLocaleString(
															"id-ID"
														)}
													</p>
												</div>
												<hr className="w-full" />
											</>
										) : null}
										{additionals.length > 0 ? (
											<>
												<div className="grid grid-cols-[100px_100px]">
													<p></p>{" "}
													<p className="text-end">
														Rp{record.total_after_disc.toLocaleString("id-ID")}
													</p>
												</div>
												{additionals.map((tax) => (
													<TaxItem key={tax.id} tax={tax} total={record.total_after_disc} />
												))}
												<hr className="w-full" />
											</>
										) : null}
										{record.rounding ? (
											<>
												<div className="grid grid-cols-[100px_100px]">
													<p></p>
													<p className="text-end">
														Rp{(record.grand_total - record.rounding).toLocaleString("id-ID")}
													</p>
												</div>
												<div className="grid grid-cols-[100px_100px]">
													<p>Pembulatan</p>
													<p className="text-end">Rp{record.rounding.toLocaleString("id-ID")}</p>
												</div>
											</>
										) : null}
										<div className="grid grid-cols-[100px_100px]">
											<p>Total</p>{" "}
											<p className="text-end">
												Rp{Number(record.grand_total).toLocaleString("id-ID")}
											</p>
										</div>
										<div className="grid grid-cols-[80px_100px_100px]">
											<p>({meth[record.method]})</p>
											<p>Pembayaran</p>
											<p className="text-end">Rp{Number(record.pay).toLocaleString("id-ID")}</p>
										</div>
										<hr className="w-full" />
										<div className="grid grid-cols-[100px_100px]">
											<p>Kembalian</p>{" "}
											<p className="text-end">Rp{Number(record.change).toLocaleString("id-ID")}</p>
										</div>
									</div>
								</div>
								<div className="flex items-center flex-col">
									{footers.map((h, i) => (
										<p className="text-center" key={i}>
											{h}
										</p>
									))}
									<p>IG: {data.ig}</p>
									<p>Shopee: {data.shopee}</p>
								</div>
							</div>
						</div>
					);
				}}
			</AwaitDangerous>
		</div>
	);
}
