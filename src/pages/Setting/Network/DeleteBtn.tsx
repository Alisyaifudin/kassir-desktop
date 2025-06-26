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
import { TextError } from "~/components/TextError";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useDelete } from "./use-delete";

export function DeleteBtn() {
	const [open, setOpen] = useState(false);
	const { loading, error, handleClick } = useDelete();
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button type="button" asChild variant="destructive">
				<DialogTrigger>Hapus</DialogTrigger>
			</Button>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Hapus semua produk pada server?</DialogTitle>
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const errMsg = await handleClick();
							if (errMsg === null) setOpen(false);
						}}
						className="flex flex-col gap-2 text-3xl"
					>
						<DialogDescription>
							Tenang, catatan produk pada aplikasi tidak akan diganggu. Hanya data pada server yang
							akan dihapus.
						</DialogDescription>
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
