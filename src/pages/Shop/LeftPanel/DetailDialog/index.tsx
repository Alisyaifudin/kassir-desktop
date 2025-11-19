import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Async } from "~/components/Async";
import { useFetchImages } from "./use-fetch-images";
import { Image } from "./Image";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

export function DetailDialog({
	productId,
	stock,
	index,
	name,
}: {
	productId: number;
	stock: number;
	name: string;
	index: number;
}) {
	const size = useSize();
	const state = useFetchImages(productId);
	return (
		<Async state={state}>
			{(srcs) => {
				if (srcs.length === 0) {
					return (
						<Popover>
							<PopoverTrigger type="button" className="flex items-center">
								<p style={style[size].text} className="text-center">
									{index + 1}
								</p>
								<Lock size={style[size].icon} />
							</PopoverTrigger>
							<PopoverContent className="flex flex-col text-2xl w-fit">
								<p style={style[size].text}>Id: {productId}</p>
								<p style={style[size].text}>Stok: {stock}</p>
							</PopoverContent>
						</Popover>
					);
				}
				return (
					<Dialog>
						<div className="flex items-center">
							<p className="text-center">{index + 1}</p>
							<DialogTrigger type="button">
								<Lock />
							</DialogTrigger>
						</div>
						<DialogContent className="max-w-7xl">
							<DialogHeader>
								<DialogTitle className="text-3xl">{name}</DialogTitle>
								<Image srcs={srcs} />
								<div className="flex items-center gap-5 text-3xl">
									<p>Id: {productId}</p>
									<p>Stok: {stock}</p>
								</div>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				);
			}}
		</Async>
	);
}
