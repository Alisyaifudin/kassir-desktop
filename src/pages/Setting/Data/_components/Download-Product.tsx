import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { useDownloadProduct } from "../_hooks/use-download-product";
import { Spinner } from "~/components/Spinner";

export function Product() {
	const { handleDownload, loading, error } = useDownloadProduct();
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
