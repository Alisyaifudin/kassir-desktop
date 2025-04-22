import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useState } from "react";

export function Manual() {
	const [disc, setDisc] = useState("number");
	return (
		<>
			<h2 className="font-bold">Manual</h2>
			<form className="flex flex-col gap-2">
				<Field label="Nama">
					<Input type="text" name="name" />
				</Field>
				<Field label="Harga">
					<Input type="number" />
				</Field>
				<Field label="Harga">
					<div className="flex items-center gap-1">
						<p>Rp</p>
						<Input type="number" />
					</div>
				</Field>
				<Field label="Kuantitas">
					<Input type="number" defaultValue={1} />
				</Field>
				<div className="flex gap-1 items-end">
					<Field label="Diskon">
						<Input type="number" defaultValue={0} />
					</Field>
					<select
						value={disc}
						onChange={(e) => {
							setDisc(e.currentTarget.value);
						}}
						className="h-[34px] w-fit outline"
					>
						<option value="number">Angka</option>
						<option value="percent">Persen</option>
					</select>
				</div>

				<Button>Tambahkan</Button>
			</form>
		</>
	);
}
