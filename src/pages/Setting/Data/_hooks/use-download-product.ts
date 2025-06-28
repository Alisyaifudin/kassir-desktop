import { Temporal } from "temporal-polyfill";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { constructCSV, err, log, ok, Result } from "~/lib/utils";
import { useDB } from "~/RootLayout";

export function useDownloadProduct() {
	const db = useDB();
	const { action, loading, error, setError } = useAction("", () => getBlob(db));
	const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const today = Temporal.Now.instant();
		const [errMsg, blob] = await action();
		setError(errMsg);
		if (errMsg !== null) {
			return;
		}
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `products_${today.epochMilliseconds}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	return { loading, error, handleDownload };
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
