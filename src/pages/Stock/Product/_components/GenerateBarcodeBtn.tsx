import { Loader2, RefreshCw } from "lucide-react";
import { Show } from "~/components/Show";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function GenerateBarcode({
	id,
	barcode,
	db,
}: {
	id: number;
	barcode: string | null;
	db: Database;
}) {
	const { error, loading, setError, action } = useAction("", () =>
		db.product.aux.generateBarcode(id)
	);
	if (barcode !== null) {
		return null;
	}
	const handleClick = async () => {
		if (loading) return;
		const [errMsg] = await action();
		setError(errMsg);
		if (errMsg === null) {
			db.product.revalidate("all");
		}
	};
	return (
		<Button type="button" variant="ghost" onClick={handleClick}>
			<Show when={loading} fallback={<RefreshCw size={35} />}>
				<Loader2 className="animate-spin" />
			</Show>
			<TextError>{error}</TextError>
		</Button>
	);
}
