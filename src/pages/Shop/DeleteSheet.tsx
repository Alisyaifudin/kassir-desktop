import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useState } from "react";

export function DeleteSheet({ tab, del }: { tab: number; del: (tab: number) => void }) {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={(open) => setOpen(open)}>
			<Button asChild variant="ghost" className="p-0">
				<DialogTrigger>
					<X />
				</DialogTrigger>
			</Button>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Hapus Sesi</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-2xl">Hapus sesi transaksi no {tab}?</DialogDescription>
				<DialogFooter>
					<Button
						variant={"destructive"}
						onClick={() => {
							setOpen(false);
							del(tab);
						}}
					>
						Hapus
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
