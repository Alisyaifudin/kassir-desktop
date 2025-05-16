import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { Input } from "~/components/ui/input";
import { numeric } from "~/lib/utils";
import { SetURLSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";

export function NewBtn({ setSearch }: { setSearch: SetURLSearchParams }) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction("", (value: number) =>
		db.money.insert(value)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("value"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		if (parsed.data < 0) {
			setError("Nilai tidak boleh kurang dari nol");
			return;
		}
		if (parsed.data > 1e12) {
			setError("Nilai tidak mungkin lebih dari 1 triliun. Serius?");
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch({ time: now.toString() });
			setOpen(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>Tambah</DialogTrigger>
			</Button>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Catatan Keuangan</DialogTitle>
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-2"
					>
						<Input name="value" placeholder="Nilai" />
						{error ? <TextError>{error}</TextError> : null}
						<div className="col-span-2 flex flex-col items-end">
							<Button>
								Tambah
								{loading && <Loader2 className="animate-spin" />}
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
