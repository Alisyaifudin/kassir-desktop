import { useLoading } from "~/hooks/use-loading";
import { ImageResult } from "../utils";
import { useSelected } from "./use-selected";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "~/components/Spinner";
import { ImageDialog } from "./ImageDialog";
import { Show } from "~/components/Show";

export function ImageControl({ images }: { images: ImageResult[] }) {
	const [selected] = useSelected(images);
	const index = images.findIndex((im) => im.id === selected?.id);
	const loading = useLoading();
	return (
		<div className="flex gap-2 w-full justify-between">
			<Form method="POST">
				<input type="hidden" name="action" value="swap-image"></input>
				<Show value={selected}>
					{(img) => (
						<>
							<input type="hidden" name="a" value={img.id}></input>
							{index <= 0 ? null : (
								<input type="hidden" name="b" value={images[index - 1].id}></input>
							)}
						</>
					)}
				</Show>
				<Button variant="ghost" className="flex text-small! items-center" disabled={index <= 0}>
					<ChevronLeft className="icon" />
					Pindahkan Kiri
				</Button>
			</Form>
			<Spinner when={loading} />
			<ImageDialog />
			<Form method="POST">
				<input type="hidden" name="action" value="swap-image"></input>
				<Show value={selected}>
					{(img) => (
						<>
							<input type="hidden" name="a" value={img.id}></input>
							{index >= images.length - 1 ? null : (
								<input type="hidden" name="b" value={images[index + 1].id}></input>
							)}
						</>
					)}
				</Show>
				<Button
					variant="ghost"
					className="flex text-small! items-center"
					disabled={index === images.length - 1}
				>
					Pindahkan Kanan
					<ChevronRight className="icon" />
				</Button>
			</Form>
		</div>
	);
}
