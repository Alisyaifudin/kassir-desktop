import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ItemComponent } from "./Item";
import { useContext, useState } from "react";
import { cn } from "../../utils";
import { useDb } from "../../Layout";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { ItemContext } from "./reducer";
import { calcChange, calcTotal, calcTotalBeforeTax, submitPayment } from "./submit";
import { TaxItem } from "./Tax";
import { TextError } from "../../components/TextError";

export function ListItem({
	mode,
	setMode,
}: {
	mode: "sell" | "buy";
	setMode: (mode: "sell" | "buy") => void;
}) {
	const { state } = useContext(ItemContext);
	const { items, taxes } = state;
	const [pay, setPay] = useState("");
	const [rounding, setRounding] = useState("");
	const [disc, setDisc] = useState<{ type: "number" | "percent"; value: string }>({
		type: "number",
		value: "",
	});
	const db = useDb();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const totalBeforeTax = calcTotalBeforeTax(items, disc);
	const total = calcTotal(totalBeforeTax, taxes, rounding);
	const change = calcChange(total, pay);
	const editPay = (value: string) => {
		if (Number.isNaN(value) || Number(value) < 0 || Number(value) >= 1e9) {
			return;
		}
		setPay(value);
	};
	const editRounding = (value: string) => {
		if (Number.isNaN(value) || Number(value) < -1e9 || Number(value) >= 1e9) {
			return;
		}
		setRounding(value);
	};
	const editTotalDiscVal = (value: string) => {
		if (
			Number.isNaN(value) ||
			Number(value) < 0 ||
			(disc.type === "number" && Number(value) >= 1e9) ||
			(disc.type === "percent" && Number(value) > 100)
		) {
			return;
		}
		setDisc((prev) => ({
			...prev,
			value,
		}));
	};
	const editTotalDiscType = (type: string) => {
		if (type !== "number" && type !== "percent") {
			return;
		}
		let value = disc.value;
		if (type === "percent" && Number(value) > 100) {
			value = "100";
		}
		setDisc({ value, type });
	};
	const handlePay = () => {
		if (change.toNumber() < 0 || Number.isNaN(pay) || pay === "") {
			return;
		}
		setLoading(true);
		submitPayment(
			db,
			mode,
			{
				rounding: Number(rounding),
				change: change.toNumber(),
				disc: {
					value: Number(disc.value),
					type: disc.type,
				},
				pay: Number(pay),
				total: totalBeforeTax.toNumber(),
				grand_total: total.toNumber(),
			},
			items,
			taxes
		)
			.then((res) => {
				const [errMsg, timestamp] = res;
				if (errMsg) {
					setError(errMsg);
					setLoading(false);
					return;
				}
				setError("");
				setLoading(false);
				navigate(`/records/${timestamp}`);
			})
			.catch((e) => {
				console.error(e);
				setError("Aplikasi bermasalah");
				setLoading(false);
			});
	};
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline flex-1 p-1 flex flex-col gap-1 overflow-y-auto">
				<div className="flex gap-2 items-center">
					<Button
						onClick={() => setMode("sell")}
						className={mode === "sell" ? "text-2xl font-bold" : "text-black/50"}
						variant={mode === "sell" ? "default" : "ghost"}
					>
						<h2 className="">Jual</h2>
					</Button>
					<Button
						onClick={() => setMode("buy")}
						className={mode === "buy" ? "text-2xl font-bold" : "text-black/50"}
						variant={mode === "buy" ? "default" : "ghost"}
					>
						<h2 className="">Beli</h2>
					</Button>
				</div>
				<div className={cn("grid gap-1 outline text-3xl", mode === "buy" ? "grid-cols-[70px_210px_1fr_150px_230px_70px_150px_50px]" : "grid-cols-[70px_1fr_150px_230px_70px_150px_50px]")}>
					<p className="border-r">No</p>
					{mode === "buy" ? <p className="border-r">Barcode</p>: null}
					<p className="border-r">Nama</p>
					<p className="border-r">Harga</p>
					<p className="border-r">Diskon</p>
					<p className="border-r">Qty</p>
					<p>Subtotal</p>
					<div />
				</div>
				<div className="flex flex-col overflow-y-auto">
					{items.map((item, i) => (
						<ItemComponent {...item} index={i} key={i} mode={mode} />
					))}
					{taxes.map((tax, i) => (
						<TaxItem
							index={i}
							key={i}
							name={tax.name}
							value={tax.value}
							totalBeforeTax={totalBeforeTax}
						/>
					))}
				</div>
			</div>
			<div className="flex items-center pr-1 h-fit gap-2">
				<div className="flex flex-col gap-2 flex-1 h-full items-center justify-center">
					<p className="font-bold text-5xl">Total</p>
					<p className="text-9xl">Rp{total.toNumber().toLocaleString("de-DE")}</p>
				</div>
				<div className="flex-1 flex flex-col gap-1 h-fit">
					<label className="grid grid-cols-[160px_10px_1fr] items-center text-3xl">
						<span className="text-3xl">Bayar</span>
						:
						<Input type="number" value={pay} onChange={(e) => editPay(e.currentTarget.value)} />
					</label>
					<div className="flex gap-2">
						<label className="grid grid-cols-[160px_10px_1fr] items-center flex-1 text-3xl">
							<span className="text-3xl">Diskon</span>
							:
							<Input
								type="number"
								value={disc.value}
								step={disc.type === "number" ? 1 : 0.01}
								onChange={(e) => editTotalDiscVal(e.currentTarget.value)}
							/>
						</label>
						<select
							value={disc.type}
							onChange={(e) => editTotalDiscType(e.currentTarget.value)}
							className=" w-[100px] outline text-2xl"
						>
							<option value="number">Angka</option>
							<option value="percent">Persen</option>
						</select>
					</div>
					<label className="grid grid-cols-[160px_10px_1fr] items-center text-3xl">
						<span className="text-3xl">Pembulatan</span>
						:
						<Input type="number" value={rounding} onChange={(e) => editRounding(e.currentTarget.value)} />
					</label>
					<div className="grid grid-cols-[160px_20px_1fr] h-[60px] text-3xl items-center">
						<p className="text-3xl">Kembalian</p>:
						<p className={cn("text-3xl", { "bg-red-500 text-white px-1": change.toNumber() < 0 })}>
							{change.toNumber().toLocaleString("de-DE")}
						</p>
					</div>
					<Button onClick={handlePay} disabled={change.toNumber() < 0}>
						Bayar {loading && <Loader2 className="animate-spin" />}
					</Button>
					{error === "" ? null : <TextError>{error}</TextError>}
				</div>
			</div>
		</div>
	);
}
