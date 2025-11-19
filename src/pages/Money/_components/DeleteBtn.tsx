import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { formatDate, formatTime, getDayName } from "~/lib/utils";
import { SetURLSearchParams } from "react-router";
import { useDel } from "../_hooks/use-del";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export const DeleteBtn = memo(function ({
	money,
	setSearch,
	revalidate,
	db,
}: {
	money: DB.Money;
	setSearch: SetURLSearchParams;
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const { error, handleSubmit, loading } = useDel(
		money.timestamp,
		setOpen,
		setSearch,
		revalidate,
		db
	);
	const size = useSize();
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button
				type="button"
				asChild
				className="rounded-full aspect-square p-2"
				variant="destructive"
			>
				<DialogTrigger>
					<X size={style[size].icon} />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Catatan</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
						<div className="grid grid-cols-[200px_1fr]">
							<p>Tanggal</p>
							<p>
								: {getDayName(money.timestamp)}, {formatDate(money.timestamp, "long")}
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
						<TextError>{error}</TextError>
						<div className="col-span-2 flex flex-col items-end">
							<Button variant="destructive">
								Hapus
								<Spinner when={loading} />
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
