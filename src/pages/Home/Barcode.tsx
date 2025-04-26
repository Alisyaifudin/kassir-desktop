import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useDb } from "../../Layout";
import { ItemContext } from "./reducer";
import { numeric } from "../../utils";
import { TextError } from "../../components/TextError";

export function Barcode() {
	const [error, setError] = useState("");
	const { dispatch } = useContext(ItemContext);
	const db = useDb();
	const [loading, setLoading] = useState(false);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (loading || error !== "") {
			return;
		}
		const formEl = e.currentTarget;
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		const parsed = numeric.safeParse(formData.get("barcode"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			setLoading(false);
			return;
		}
		const [errMsg, product] = await db.product.getByBarcode(parsed.data);
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		dispatch({
			action: "add-barcode",
			data: {
				id: product.id,
				name: product.name,
				price: product.price.toString(),
				stock: product.stock,
			},
		});
		setLoading(false);
		setError("");
		formEl.reset();
	};
	return (
		<form onSubmit={handleSubmit}>
			<Field label="Barcode">
				<div className="flex gap-1 items-center ">
					<div className="flex-1">
						<Input type="number" name="barcode" required />
					</div>
					<Button disabled={loading} className="h-13 w-13 px-0 py-0">
						{loading ? <Loader2 className="animate-spin" size={30} /> : <Search size={35} />}
					</Button>
				</div>
			</Field>
			{error === "" ? null : <TextError>{error}</TextError>}
		</form>
	);
}
