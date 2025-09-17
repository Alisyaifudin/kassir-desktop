import { Button } from "~/components/ui/button";
import { Field } from "../../Field";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { useManual } from "../../../_hooks/use-manual";
import { useFix } from "../../../_hooks/use-fix";
import { Show } from "~/components/Show";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";
import { useMode } from "~/pages/shop/_hooks/use-mode";

export function Manual({ products, context }: { products: DB.Product[]; context: LocalContext }) {
	const { handleSubmit, error, ref } = useManual(products, context);
	const [fix] = useFix(context);
	const [mode] = useMode(context);
	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-2 grow shrink px-1 basis-0 overflow-y-auto"
		>
			<Field label="Barcode" error={error.barcode}>
				<Input ref={ref} type="text" name="barcode" aria-autocomplete="list" />
			</Field>
			<Field label="Nama" error={error.name}>
				<Input type="text" required name="name" aria-autocomplete="list" />
			</Field>
			<div className="flex gap-1 items-center">
				<Show when={mode === "sell"}>
					<Field label="Kuantitas">
						<Input type="number" defaultValue={1} required name="qty" aria-autocomplete="list" />
					</Field>
				</Show>
				<Field label="Stok" error={error.qty}>
					<Input type="number" defaultValue={1} required name="stock" aria-autocomplete="list" />
				</Field>
			</div>
			<Field label="Harga" error={error.price}>
				<div className="flex items-center gap-1">
					<p className="text-2xl">Rp</p>
					<Input
						type="number"
						required
						name="price"
						step={1 / Math.pow(10, fix)}
						aria-autocomplete="list"
					/>
				</div>
			</Field>
			<TextError>{error.qty}</TextError>
			<Button>Tambahkan</Button>
		</form>
	);
}
