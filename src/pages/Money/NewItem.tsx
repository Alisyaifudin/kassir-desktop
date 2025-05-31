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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export function NewBtn({
	setSearch,
	kind,
}: {
	setSearch: SetURLSearchParams;
	kind: "saving" | "debt" | "diff";
}) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction(
		"",
		({ value, type }: { type: "change" | "abs"; value: number }) =>
			type === "abs" ? db.money.insertAbs(value, kind) : db.money.insertChange(value, kind)
	);
	const handleSubmitAbs = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("value"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		if (parsed.data < 0 && kind !== "diff") {
			setError("Nilai tidak boleh kurang dari nol");
			return;
		}
		if (parsed.data > 1e12) {
			setError("Nilai tidak mungkin lebih dari 1 triliun. Serius?");
			return;
		}
		const errMsg = await action({ value: parsed.data, type: "abs" });
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch({ time: now.toString(), kind });
			setOpen(false);
		}
	};
	const handleSubmitChange = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = numeric.safeParse(formData.get("value"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		if (parsed.data < -1e12) {
			setError("Nilai tidak mungkin kurang dari -1 triliun. Serius?");
			return;
		}
		if (parsed.data > 1e12) {
			setError("Nilai tidak mungkin lebih dari 1 triliun. Serius?");
			return;
		}
		const errMsg = await action({ value: parsed.data, type: "change" });
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch({ time: now.toString(), kind });
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
					{kind === "diff" ? (
						<form onSubmit={handleSubmitAbs} className="flex flex-col gap-2">
							<Input name="value" placeholder="Nilai" aria-autocomplete="list" type="number" />
							{error ? <TextError>{error}</TextError> : null}
							<div className="col-span-2 flex flex-col items-end">
								<Button>
									Tambah
									{loading && <Loader2 className="animate-spin" />}
								</Button>
							</div>
						</form>
					) : (
						<Tabs defaultValue="change" className="w-full">
							<TabsList>
								<TabsTrigger value="change">Perubahan</TabsTrigger>
								<TabsTrigger value="absolute">Mutlak</TabsTrigger>
							</TabsList>
							<TabsContent value="change">
								<form onSubmit={handleSubmitChange} className="flex flex-col gap-2">
									<Input name="value" placeholder="Nilai" aria-autocomplete="list" type="number" />
									{error ? <TextError>{error}</TextError> : null}
									<div className="col-span-2 flex flex-col items-end">
										<Button>
											Tambah
											{loading && <Loader2 className="animate-spin" />}
										</Button>
									</div>
								</form>
							</TabsContent>
							<TabsContent value="absolute">
								<form onSubmit={handleSubmitAbs} className="flex flex-col gap-2">
									<Input name="value" placeholder="Nilai" aria-autocomplete="list" type="number" />
									{error ? <TextError>{error}</TextError> : null}
									<div className="col-span-2 flex flex-col items-end">
										<Button>
											Tambah
											{loading && <Loader2 className="animate-spin" />}
										</Button>
									</div>
								</form>
							</TabsContent>
						</Tabs>
					)}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
