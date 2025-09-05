import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Show } from "~/components/Show";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function GenerateBarcode({
	barcodeRef,
	db,
}: {
	barcodeRef: React.RefObject<HTMLInputElement>;
	db: Database;
}) {
	const [hide, setHide] = useState(false);
	const { error, loading, setError, action } = useAction("", () =>
		db.product.aux.proposeBarcode()
	);
	useEffect(() => {
		if (barcodeRef.current === null) return;
		const handleInput = (e: Event) => {
			const target = e.target as HTMLInputElement;
			if (target.value === "") {
				setHide(false);
			} else {
				setHide(true);
			}
		};

		barcodeRef.current.addEventListener("input", handleInput);
		return () => {
			if (barcodeRef.current) {
				barcodeRef.current.removeEventListener("input", handleInput);
			}
		};
	}, [barcodeRef]);
	if (hide) {
		return null;
	}
	const handleClick = async () => {
		if (loading || barcodeRef.current === null) return;
		const [errMsg, val] = await action();
		setError(errMsg);
		if (errMsg === null) {
			barcodeRef.current.value = val;
			setHide(true);
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
