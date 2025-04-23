import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { z } from "zod";
import { ItemContext, itemMethod } from "./item-method";
import { Loader2, Search } from "lucide-react";
import { useDb } from "../../Layout";

export function Barcode() {
	const [error, setError] = useState("");
	const { setItems } = useContext(ItemContext);
	const db = useDb();
	const { addItemBarcode } = itemMethod(db, setItems);
	const [loading, setLoading] = useState(false);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formEl = e.currentTarget;
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		const parsed = z.string().safeParse(formData.get("barcode"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			setLoading(false);
			return;
		}
		const errMsg = await addItemBarcode(parsed.data);
		if (errMsg) setError(errMsg);
		setLoading(false);
		setError("");
		formEl.reset();
	};
	return (
		<form onSubmit={handleSubmit}>
			<Field label="Barcode">
				<div className="flex gap-1 items-center">
					<Input type="number" name="barcode" required />
					<Button disabled={loading} className="w-fit px-2">
						{loading ? <Loader2 className="animate-spin" /> : <Search />}
					</Button>
				</div>
			</Field>
			{error === "" ? null : <p className="text-red-500">{error}</p>}
		</form>
	);
}
