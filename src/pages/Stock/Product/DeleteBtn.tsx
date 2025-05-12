import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogClose,
} from "~/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useDB } from "~/RootLayout";
import { TextError } from "~/components/TextError";
import { getBackURL } from "~/lib/utils";
import { useAction } from "~/hooks/useAction";
import { useProducts } from "~/Layout";

export function DeleteBtn({ id, name }: { id: number; name: string }) {
	const navigate = useNavigate();
	const db = useDB();
	const { action, loading, error, setError } = useAction("", (id: number) => db.product.delete(id));
	const { revalidate } = useProducts();
	const backURL = getBackURL("/stock", new URLSearchParams(window.location.search));
	const handleClick = async () => {
		const errMsg = await action(id);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
			navigate(backURL);
		}
	};
	return (
		<Dialog>
			<Button asChild variant="destructive">
				<DialogTrigger>Hapus</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Yakin?</DialogTitle>
					<DialogDescription className="text-2xl">Kamu akan menghapus:</DialogDescription>
					<DialogDescription className="text-2xl">
						{">"}
						{name}
					</DialogDescription>
					<div className="flex justify-between mt-5">
						<Button asChild>
							<DialogClose>Batal</DialogClose>
						</Button>
						<Button onClick={handleClick} variant="destructive">
							Hapus {loading && <Loader2 className="animate-spin" />}
						</Button>
					</div>
					{error ? <TextError>{error}</TextError> : null}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
