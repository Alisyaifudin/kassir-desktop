import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import type { ItemTransform } from "~/pages/Shop/util-generate-record";
import { useDiscountForm } from "./use-discount-form";
import Decimal from "decimal.js";
import { useFix } from "~/pages/Shop/use-fix";
import { ForEach } from "~/components/ForEach";

export function Discount({ itemIndex, item }: { itemIndex: number; item: ItemTransform }) {
	const { discs, handle } = useDiscountForm(itemIndex, item.discs);
	const [fix] = useFix();
	const totalDisc = Number(new Decimal(item.total).minus(item.grandTotal).toFixed(fix));
	return (
		<Dialog>
			<div className="flex items-center justify-between px-1 gap-1">
				<p className="text-3xl">{totalDisc.toLocaleString("id-ID")}</p>
				<DialogTrigger type="button">
					<Plus className="outline" />
				</DialogTrigger>
			</div>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Diskon</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-[1fr_110px_50px] gap-1 text-3xl items-center">
					<ForEach items={discs}>
						{(disc, i) => (
							<>
								<Input
									type="number"
									value={disc.value}
									onChange={handle.changeValue(i)}
									aria-autocomplete="list"
								></Input>
								<select
									value={disc.kind}
									onChange={handle.changeKind(i)}
									className=" w-[110px] border"
								>
									<option value="number">Angka</option>
									<option value="percent">Persen</option>
								</select>
								<button
									onClick={handle.del(i)}
									type="button"
									className="bg-red-500 w-fit h-fit text-white"
								>
									<X size={35} />
								</button>
							</>
						)}
					</ForEach>
					<Button onClick={handle.add} type="button">
						Tambah Diskon
						<Plus />
					</Button>
				</div>
				<DialogFooter className="flex justify-between w-full ">
					<DialogClose asChild>
						<Button type="button" variant="outline">
							Tutup
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
