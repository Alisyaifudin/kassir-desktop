import { Button } from "../../../components/ui/button";
import { Database } from "../../../database";
import { constructCSV, err, log, ok, Result } from "../../../lib/utils";
import { useState } from "react";
import { useDb } from "../../../Layout";
import { TextError } from "../../../components/TextError";
import { Loader2 } from "lucide-react";
import { Temporal } from "temporal-polyfill";

export function Product() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const db = useDb();
	const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		const today = Temporal.Now.instant();
		const [errMsg, blob] = await getBlob(db);
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		setError("");
		setLoading(false);
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `products_${today.epochMilliseconds}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	return (
		<form
			onSubmit={handleDownload}
			className="flex gap-2 items-center justify-between p-2 bg-sky-50"
		>
			<h3 className="italic">Produk</h3>
			<Button>Unduh {loading ? <Loader2 className="animate-spin" /> : null}</Button>
			{error ? <TextError>{error}</TextError> : null}
		</form>
	);
}

async function getBlob(db: Database): Promise<Result<string, Blob>> {
	const [errMsg, products] = await db.product.getAll();
	if (errMsg !== null) {
		log.error(errMsg);
		return err(errMsg);
	}
	const csv = constructCSV(products);
	const blob = new Blob([csv], { type: "text/csv" });
	return ok(blob);
}
