import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { useDownloadProduct } from "../_hooks/use-download-product";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function Product({ db }: { db: Database }) {
	const { handleDownload, loading, error } = useDownloadProduct(db);
	const size = useSize()
	return (
		<form
			onSubmit={handleDownload}
			className="flex gap-2 items-center justify-between p-2 bg-sky-50"
		>
			<h3 className="italic">Produk</h3>
			<Button style={style[size].text}>
				Unduh
				<Spinner when={loading} />
			</Button>
			<TextError>{error}</TextError>
		</form>
	);
}
