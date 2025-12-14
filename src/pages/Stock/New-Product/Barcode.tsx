import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Show } from "~/components/Show";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useSubmit } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Field } from "../Field";

export function Barcode({ error }: { error?: string }) {
	const [barcode, setBarcode] = useState("");
	const errorGen = useAction<Action>()("propose-barcode");
	useEffect(() => {
		if (errorGen?.barcode !== undefined) {
			setBarcode(errorGen.barcode);
		}
	}, [errorGen]);
	return (
		<div className="flex items-center gap-2 w-full">
			<Field error={error ?? errorGen?.error} label="Kode">
				<Input
					type="text"
					className="outline w-full"
					name="barcode"
					aria-autocomplete="list"
					value={barcode ?? ""}
					onChange={(e) => setBarcode(e.currentTarget.value)}
				/>
			</Field>
			<Show when={barcode === null || barcode === ""}>
				<GenerateBarcode />
			</Show>
		</div>
	);
}

function GenerateBarcode() {
	const loading = useLoading();
	const submit = useSubmit();
	const error = useAction<Action>()("propose-barcode");
	const handleClick = () => {
		const formdata = new FormData();
		formdata.set("action", "propose-barcode");
		submit(formdata, { method: "POST" });
	};
	return (
		<div>
			<Button onClick={handleClick} type="button" variant="ghost">
				<Show when={loading} fallback={<RefreshCw className="icon" />}>
					<Loader2 className="animate-spin icon" />
				</Show>
				<TextError>{error?.error}</TextError>
			</Button>
		</div>
	);
}
