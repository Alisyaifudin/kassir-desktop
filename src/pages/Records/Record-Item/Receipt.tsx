import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { err, formatDate, formatTime, METHOD_NAMES, ok, Result } from "~/lib/utils";
import { ReceiptItem } from "./ReceiptItem";
import { getProfile } from "~/pages/Setting/Shop/setting-api";
import { Await } from "~/components/Await";
import { TaxItem } from "./TaxItem";
import { useDB, useStore } from "~/RootLayout";
import { useAsync } from "~/hooks/useAsync";
import { Profile } from "~/store";

const title = {
	buy: "Beli",
	sell: "Jual",
};

export function Receipt({
	items,
	record,
	additionals,
	discs,
	methods,
}: {
	record: DB.Record;
	items: DB.RecordItem[];
	discs: DB.Discount[];
	additionals: DB.Additional[];
	methods: DB.MethodType[];
}) {
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
	if (items.length === 0) {
		return null;
	}
	const print = () => {
		document.documentElement.style.setProperty("--paper-width", `${width}`);
		window.print();
	};
	const methodType = methods.find((m) => m.id === record.method_type);
	const methodTypeName = methodType === undefined ? "" : " " + methodType.name;
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
			<Await state={info}>
				{({ profile, socials }) => {
					const headers = profile.header === undefined ? [] : profile.header.split("\n");
					const footers = profile.footer === undefined ? [] : profile.footer.split("\n");
					return (
						<div className="border pt-5">
							<div id="print-container" className="flex flex-col gap-2 overflow-auto px-2">
								<div className="flex flex-col">
									<p className="text-center text-lg font-bold">{profile.owner}</p>
									{headers.map((h, i) => (
										<p key={i} className="text-center">
											{h}
										</p>
									))}
									<p>{profile.address}</p>
									{record.cashier && profile.showCashier === "true" ? (
										<p>Kasir: {record.cashier}</p>
									) : null}
									<div className="flex items-center justify-between">
										<p>No: {record.timestamp}</p>
										<p>
											{formatDate(record.timestamp, "short").replace(/-/g, "/")},{" "}
											{formatTime(record.timestamp)}
										</p>
									</div>
								</div>
								<hr />
								{items.map((item, i) => (
									<ReceiptItem
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
										<div className="grid grid-cols-[1fr_100px_100px]">
											<p className="pr-5">
												({METHOD_NAMES[record.method]}
												{methodTypeName})
											</p>
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
									{socials.map((s) => (
										<p key={s.id}>
											{s.name}: {s.value}
										</p>
									))}
								</div>
							</div>
						</div>
					);
				}}
			</Await>
		</div>
	);
}

const useInfo = () => {
	const store = useStore();
	const db = useDB();
	const info = useAsync(
		async (): Promise<
			Result<
				"Aplikasi bermasalah",
				{
					profile: Profile;
					socials: DB.Social[];
				}
			>
		> => {
			const [profile, [errSocial, socials]] = await Promise.all([
				getProfile(store.profile),
				db.social.get(),
			]);
			if (errSocial) {
				return err(errSocial);
			}
			return ok({ profile, socials });
		}
	);
	return info;
};
