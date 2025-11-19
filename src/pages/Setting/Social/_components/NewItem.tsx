import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { useAdd } from "../_hooks/use-add";
import { Spinner } from "~/components/Spinner";
import { Database } from "~/database";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

const grid = {
	big: {
		gridTemplateColumns: "250px 1fr",
	},
	small: {
		gridTemplateColumns: "200px 1fr",
	},
};

export const NewBtn = memo(function ({ db, revalidate }: { db: Database; revalidate: () => void }) {
	const [open, setOpen] = useState(false);
	const size = useSize();
	const { loading, error, handleSubmit } = useAdd(setOpen, revalidate, db);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button style={style[size].text} asChild>
				<DialogTrigger>Tambah</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Tambah Kontak</DialogTitle>
					<form
						style={grid[size]}
						onSubmit={handleSubmit}
						className="grid gap-2 items-center justify-end"
					>
						<Input
							style={style[size].text}
							name="name"
							placeholder="Nama Kontak"
							aria-autocomplete="list"
						/>
						<Input
							style={style[size].text}
							name="value"
							placeholder="Isian Kontak"
							aria-autocomplete="list"
						/>
						{error ? (
							<>
								<TextError>{error.name}</TextError>
								<TextError>{error.value}</TextError>
							</>
						) : null}
						<div className="col-span-2 flex flex-col items-end">
							<TextError>{error?.global}</TextError>
							<Button style={style[size].text}>
								Tambah
								<Spinner when={loading} />
							</Button>
						</div>
					</form>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
});
