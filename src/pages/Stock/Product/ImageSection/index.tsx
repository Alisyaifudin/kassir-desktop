import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { use } from "react";
import { cn } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { DeleteImg } from "./DeleteImg";
import { ImagePromise, ImageResult } from "../utils";
import { ImageControl } from "./ImageControl";
import { useSelected } from "./use-selected";
import { useChange } from "./use-change";
import { useContainerSize, useControlSize } from "./use-container-size";

export function ImageSection({
	images: promise,
	role,
}: {
	images: ImagePromise;
	role: "user" | "admin";
}) {
	const [errMsg, images] = use(promise);
	if (errMsg) {
		return <TextError>{errMsg}</TextError>;
	}
	return <ImageList images={images} role={role} />;
}

function ImageList({ images, role }: { images: ImageResult[]; role: "user" | "admin" }) {
	const [selected, setSelected] = useSelected(images);
	const [index, handlePrev, handleNext] = useChange(images);
	const container = useContainerSize();
	const [ref, control] = useControlSize();
	return (
		<div className="flex flex-col gap-1 flex-1 w-full min-h-0">
			<div className="flex-1 min-h-0 justify-center  items-center flex">
				<Button
					className="h-full px-0"
					variant="secondary"
					onClick={handlePrev}
					disabled={index <= 0}
				>
					<ChevronLeft />
				</Button>
				<div
					style={{ height: container.height - control.height }}
					className="relative flex-1 min-h-0  flex justify-center items-center overflow-hidden"
				>
					<img className="max-w-full max-h-full object-contain" src={selected?.href} />
					{selected && role === "admin" ? <DeleteImg selected={selected} /> : null}
				</div>
				<Button
					className="h-full px-0"
					variant="secondary"
					disabled={index === images.length - 1}
					onClick={handleNext}
				>
					<ChevronRight />
				</Button>
			</div>
			<div ref={ref} className="flex flex-col w-full min-h-0">
				<div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
					{images.map((image, i) => (
						<button
							key={i}
							className="h-32 aspect-square p-0.5"
							onClick={() => setSelected(image.id)}
						>
							<Image image={image} selected={selected!} />
						</button>
					))}
				</div>
				<ImageControl images={images} />
			</div>
		</div>
	);
}

function Image({ image, selected }: { image: ImageResult; selected: ImageResult }) {
	return (
		<img
			className={cn("object-contain w-full h-full", {
				outline: selected.id === image.id,
			})}
			src={image.href}
		/>
	);
}
