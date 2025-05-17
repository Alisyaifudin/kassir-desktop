import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { useAction } from "~/hooks/useAction";
import { getDay } from "~/pages/Records/Record-Item/Detail";
import { formatDate, formatTime } from "~/lib/utils";
import { SetURLSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";

export function DeleteBtn({
	money,
	setSearch,
}: {
	money: DB.Money;
	setSearch: SetURLSearchParams;
}) {
	const db = useDB();
	const [open, setOpen] = useState(false);
	const { loading, error, setError, action } = useAction("", (timestamp: number) =>
		db.money.delete(timestamp)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const errMsg = await action(money.timestamp);
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch((prev) => ({
				time: now.toString(),
				kind: prev.get("kind") ?? "saving",
			}));
			setOpen(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button type="button" asChild className="rounded-full" variant="destructive">
				<DialogTrigger>
					<X size={30} />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Catatan</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
						<div className="grid grid-cols-[200px_1fr]">
							<p>Tanggal</p>
							<p>
								: {getDay(money.timestamp).name}, {formatDate(money.timestamp, "long")}
							</p>
						</div>
						<div className="grid grid-cols-[200px_1fr]">
							<p>Waktu</p>
							<p>: {formatTime(money.timestamp, "long")}</p>
						</div>
						<div className="grid grid-cols-[200px_1fr]">
							<p>Nilai</p>
							<p>: Rp{money.value.toLocaleString("id-ID")}</p>
						</div>
						{error ? <TextError>{error}</TextError> : null}
						<div className="col-span-2 flex flex-col items-end">
							<Button variant="destructive">
								Hapus
								{loading && <Loader2 className="animate-spin" />}
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
