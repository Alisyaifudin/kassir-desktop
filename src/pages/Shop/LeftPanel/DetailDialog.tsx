import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDB } from "~/RootLayout";
import { useState } from "react";
import { image } from "~/lib/image";
import { Lock } from "lucide-react";
import { useAsync } from "~/hooks/useAsync";
import { cn, err, ok, Result } from "~/lib/utils";
import { Await } from "~/components/Await";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

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
	const state = useFetchImages(productId);
	return (
		<Await state={state}>
			{(srcs) => {
				if (srcs.length === 0) {
					return (
						<Popover>
							<PopoverTrigger className="flex items-center">
								<p className="text-center">{index + 1}</p>
								<Lock />
							</PopoverTrigger>
							<PopoverContent className="flex flex-col text-2xl w-fit">
								<p>Id: {productId}</p>
								<p>Stok: {stock}</p>
							</PopoverContent>
						</Popover>
					);
				}
				return (
					<Dialog>
						<div className="flex items-center">
							<p className="text-center">{index + 1}</p>
							<DialogTrigger>
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
		</Await>
	);
}

function useFetchImages(id: number) {
	const db = useDB();
	const state = useAsync(async (): Promise<Result<"Aplikasi bermasalah", string[]>> => {
		const [errMsg, images] = await db.image.getImages(id);
		if (errMsg) return err(errMsg);
		const promises = [];
		for (const img of images) {
			promises.push(image.load(img.name, img.mime));
		}
		const res = await Promise.all(promises);
		const srcs = [];
		for (const [msg, src] of res) {
			if (msg) return err(msg);
			srcs.push(src);
		}
		return ok(srcs);
	});
	return state;
}

function Image({ srcs }: { srcs: string[] }) {
	const [selected, setSelected] = useState(srcs[0]);
	const index = srcs.findIndex((src) => src === selected);
	const handlePrev = () => {
		if (index <= 0) {
			return;
		}
		setSelected(srcs[index - 1]);
	};
	const handleNext = () => {
		if (index + 1 >= srcs.length) {
			return;
		}
		setSelected(srcs[index + 1]);
	};
	const handleClick = (index: number) => () => {
		setSelected(srcs[index]);
	};
	return (
		<div className="flex flex-col gap-1 h-[95%] w-full">
			<div className="flex-1 justify-center items-center flex">
				<Button
					className="h-full px-0"
					variant="secondary"
					onClick={handlePrev}
					disabled={index <= 0}
				>
					<ChevronLeft />
				</Button>
				<div className="relative h-[600px] flex-1 flex justify-center items-center">
					<img className="object-contain h-full" src={selected} />
				</div>
				<Button
					className="h-full px-0"
					variant="secondary"
					disabled={index === srcs.length - 1}
					onClick={handleNext}
				>
					<ChevronRight />
				</Button>
			</div>
			<div className="flex flex-col w-full">
				<div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
					{srcs.map((src, i) => (
						<button key={i} className={"h-32 aspect-square p-0.5"} onClick={handleClick(i)}>
							<img
								className={cn("object-contain w-full h-full", {
									outline: selected === src,
								})}
								src={src}
							/>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
