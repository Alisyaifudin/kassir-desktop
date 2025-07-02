import { Button } from "~/components/ui/button";
import { ImageDialog } from "./ImageDialog";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { AwaitDangerous } from "~/components/Await";
import { useEffect, useState } from "react";
import { cn, numeric } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { DeleteImg } from "./DeleteImg";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";
import { SetURLSearchParams, useSearchParams } from "react-router";
import { Database } from "~/database";
import { useGetImages } from "../_hooks/use-get-images";

export function Images({
	images,
	productId,
	role,
	revalidate,
	db,
}: {
	images: DB.Image[];
	productId: number;
	role: "user" | "admin";
	revalidate: () => void;
	db: Database;
}) {
	const state = useGetImages(images);
	return (
		<AwaitDangerous state={state}>
			{(data) => {
				const imgs: (DB.Image & { src: string })[] = [];
				let i = 0;
				for (const [errMsg, img] of data) {
					if (errMsg) {
						return <TextError>{errMsg}</TextError>;
					}
					imgs.push({ ...images[i], src: img });
					i += 1;
				}
				return (
					<ImageList
						images={imgs}
						productId={productId}
						role={role}
						revalidate={revalidate}
						db={db}
					/>
				);
			}}
		</AwaitDangerous>
	);
}

function ImageList({
	images,
	productId,
	role,
	revalidate,
	db,
}: {
	images: (DB.Image & { src: string })[];
	productId: number;
	role: "user" | "admin";
	revalidate: () => void;
	db: Database;
}) {
	const [search, setSearch] = useSearchParams();
	const selectedId = getSelectedId(search);
	const selectedImg = images.find((img) => img.id === selectedId);
	const [selected, setSelected] = useState(images.length === 0 ? null : selectedImg ?? images[0]);
	useEffect(() => {
		if (selectedId === null && images.length > 0) {
			setSelectedId(setSearch, images[0].id);
		}
	}, []);
	const { action, loading, error, setError } = useAction(
		"",
		async (input: { a: number; b: number }) => {
			if (role !== "admin") return "Tindakan dilarang!";
			const errMsg = db.image.update.swap(input.a, input.b);
			return errMsg;
		}
	);
	const changeSelected = (image: (DB.Image & { src: string }) | null) => {
		setSelected(image);
		if (image) setSelectedId(setSearch, image.id);
	};
	const index = selected ? images.findIndex((img) => img.id === selected.id) : -1;
	const handleShiftPrev = async () => {
		if (index <= 0) {
			return;
		}
		const errMsg = await action({ a: selected!.id, b: images[index - 1].id });
		setError(errMsg);
		if (errMsg) {
			return;
		}
		setSelectedId(setSearch, images[index - 1].id);
		revalidate();
	};
	const handleShiftNext = async () => {
		if (index === -1 || index === images.length - 1) {
			return;
		}
		const errMsg = await action({ a: selected!.id, b: images[index + 1].id });
		setError(errMsg);
		if (errMsg) {
			return;
		}
		emitter.emit("fetch-images");
		setSelectedId(setSearch, images[index + 1].id);
	};
	const handleChangePrev = () => {
		if (index <= 0) {
			return;
		}
		setSelected(images[index - 1]);
		setSelectedId(setSearch, images[index - 1].id);
	};
	const handleChangeNext = () => {
		if (index + 1 >= images.length) {
			return;
		}
		setSelected(images[index + 1]);
		setSelectedId(setSearch, images[index + 1].id);
	};
	return (
		<div className="flex flex-col gap-1 h-[95%] w-full">
			<div className="flex-1 justify-center items-center flex">
				<Button
					className="h-full px-0"
					variant="secondary"
					onClick={handleChangePrev}
					disabled={index <= 0}
				>
					<ChevronLeft />
				</Button>
				<div className="relative h-[600px] flex-1 flex justify-center items-center">
					<img className="object-contain h-full" src={selected?.src} />
					{selected && role === "admin" ? (
						<DeleteImg
							selected={selected}
							images={images}
							setSelectedId={(id: number) => setSelectedId(setSearch, id)}
							db={db}
						/>
					) : null}
				</div>
				<Button
					className="h-full px-0"
					variant="secondary"
					disabled={index === images.length - 1}
					onClick={handleChangeNext}
				>
					<ChevronRight />
				</Button>
			</div>
			<div className="flex flex-col w-full">
				<div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
					{images.map((image, i) => (
						<button
							key={i}
							className={cn("h-32 aspect-square p-0.5")}
							onClick={() => changeSelected(image)}
						>
							<Image image={image} selected={selected!} />
						</button>
					))}
				</div>
				{error ? <TextError>{error}</TextError> : null}
				{role === "admin" ? (
					<div className="flex gap-2 w-full justify-between">
						<Button
							variant="ghost"
							className="flex items-center"
							disabled={index <= 0}
							onClick={handleShiftPrev}
						>
							<ChevronLeft />
							Pindahkan Kiri
							{loading ? <Loader2 className="animate-spin" /> : null}
						</Button>
						<ImageDialog productId={productId} db={db} />
						<Button
							variant="ghost"
							className="flex items-center"
							disabled={index === images.length - 1}
							onClick={handleShiftNext}
						>
							{loading ? <Loader2 className="animate-spin" /> : null}
							Pindahkan Kanan
							<ChevronRight />
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}

function Image({
	image,
	selected,
}: {
	image: DB.Image & { src: string };
	selected: DB.Image & { src: string };
}) {
	return (
		<img
			className={cn("object-contain w-full h-full", {
				outline: selected.id === image.id,
			})}
			src={image.src}
		/>
	);
}

function getSelectedId(search: URLSearchParams) {
	const parsed = numeric.safeParse(search.get("selected"));
	const id = parsed.success ? parsed.data : null;
	return id;
}

function setSelectedId(setSearch: SetURLSearchParams, id: number) {
	setSearch((prev) => {
		const search = new URLSearchParams(prev);
		search.set("selected", id.toString());
		return search;
	});
}
