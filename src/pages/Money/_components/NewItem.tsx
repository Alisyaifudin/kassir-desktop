import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { SetURLSearchParams } from "react-router";
import { SelectType } from "./SelectType";
import { useNewItem } from "../_hooks/use-new-item";
import { Database } from "~/database";
import { NumberField } from "~/components/NumberField";

export const NewBtn = memo(function ({
	setSearch,
	kind,
	revalidate,
	db,
}: {
	setSearch: SetURLSearchParams;
	kind: "saving" | "debt" | "diff";
	revalidate: () => void;
	db: Database;
}) {
	const [open, setOpen] = useState(false);
	const [type, setType] = useState<"change" | "absolute">(kind === "debt" ? "change" : "absolute");
	const { error, loading, handleSubmitAbs, handleSubmitChange } = useNewItem(
		kind,
		setOpen,
		setSearch,
		revalidate,
		db
	);
	const handleSubmit = type === "absolute" ? handleSubmitAbs : handleSubmitChange;
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild>
				<DialogTrigger>Catatan Baru</DialogTrigger>
			</Button>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Catatan Keuangan</DialogTitle>
					<form onSubmit={handleSubmit} className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<NumberField
								name="value"
								placeholder="Nilai"
								aria-autocomplete="list"
							/>
							{kind === "diff" ? null : <SelectType type={type} onChange={setType} />}
						</div>
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
});
