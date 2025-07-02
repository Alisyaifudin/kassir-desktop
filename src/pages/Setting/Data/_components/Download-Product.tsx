import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { useDownloadProduct } from "../_hooks/use-download-product";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";

export function Product({ db }: { db: Database }) {
	const { handleDownload, loading, error } = useDownloadProduct(db);
	return (
		<form
			onSubmit={handleDownload}
			className="flex gap-2 items-center justify-between p-2 bg-sky-50"
		>
			<h3 className="italic">Produk</h3>
			<Button>
				Unduh
				<Spinner when={loading} />
			</Button>
			<TextError>{error}</TextError>
		</form>
	);
}
