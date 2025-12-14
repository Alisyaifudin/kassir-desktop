import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Form, useActionData } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { err, Result } from "~/lib/utils";
import { useEffect } from "react";

export function Product() {
	const loading = useLoading();
	const [error, res] = useAction();
	useDownload(res);
	return (
		<Form method="POST" className="flex gap-2 items-center justify-between p-2 bg-sky-50">
			<input type="hidden" name="action" value="product"></input>
			<h3 className="italic text-normal font-bold">Produk</h3>
			<Button>
				Unduh
				<Spinner when={loading} />
			</Button>
			<TextError>{error}</TextError>
		</Form>
	);
}

function useAction(): Result<string | null, { name: string; csv: string }> {
	const data = useActionData<Action>();
	if (data !== undefined && data.action === "product") {
		return data.res;
	}
	return err(null);
}

function useDownload(res: { name: string; csv: string } | null) {
	useEffect(() => {
		if (res === null) {
			return;
		}
		const blob = new Blob([res.csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = res.name;
		a.click();
		URL.revokeObjectURL(url);
	}, [res]);
}
