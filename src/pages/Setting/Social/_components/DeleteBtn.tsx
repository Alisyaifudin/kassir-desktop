import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useDel } from "../_hooks/use-del";
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const localStyle = {
	big: {
		icon: 35,
		iconBtn: {
			padding: "16px",
		},
		grid: {
			gridTemplateColumns: "200px 1fr",
		},
	},
	small: {
		icon: 25,
		iconBtn: {
			padding: "5px",
		},
		grid: {
			gridTemplateColumns: "100px 1fr",
		},
	},
};

export const DeleteBtn = memo(function ({
	id,
	name,
	value,
	revalidate,
	db,
}: {
	id: number;
	name: string;
	value: string;
	revalidate: () => void;
	db: Database;
}) {
	const size = useSize();
	const [open, setOpen] = useState(false);
	const { loading, error, handleSubmit } = useDel(id, setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button
				style={localStyle[size].iconBtn}
				type="button"
				asChild
				className="w-fit rounded-full"
				variant="destructive"
			>
				<DialogTrigger>
					<X size={localStyle[size].icon} />
				</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle style={style[size].h1}>Hapus Kontak</DialogTitle>
					<form style={style[size].h1} onSubmit={handleSubmit} className="flex flex-col gap-2">
						<div style={localStyle[size].grid} className="grid">
							<p>Nama</p>
							<p>: {name}</p>
						</div>
						<div style={localStyle[size].grid} className="grid">
							<p>Isian</p>
							<p>: {value}</p>
						</div>
						{error ? <TextError>{error}</TextError> : null}
						<div className="col-span-2 flex flex-col items-end">
							<Button style={style[size].text} variant="destructive">
								Hapus
								{loading && <Loader2 className="animate-spin" />}
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
