import { Effect } from "effect";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { promisify } from "~/lib/promisify";
import { ImageService } from "~/services/image";
import { ImageResult } from "~/services/image/type";
import { ImageError } from "~/services/image/error";
import { UserService } from "~/services/user";
import { StateWrap } from "~/components/StateWrap";
import { ErrorComponent } from "~/components/ErrorComponent";
import { Loading } from "./z-Loading";
import { DeleteImg } from "./z-DeleteImg";
import { ImageControl } from "./z-ImageControl";
import { useSelected } from "./use-selected";
import { useChange } from "./use-change";
import { useContainerSize, useControlSize } from "./use-container-size";
import { useId } from "../use-id";

const page = Effect.gen(function* () {
  const imageService = yield* ImageService;
  const userService = yield* UserService;

  const onAdd = (productId: string, file: File) =>
    promisify(
      () => imageService.add(productId, file),
      (e: ImageError) => e.e.message,
    );
  const onDelete = (productId: string, id: string) =>
    promisify(
      () => imageService.delete(productId, id),
      (e: ImageError) => e.e.message,
    );
  const onSwap = (a: string, b: string) =>
    promisify(
      () => imageService.swap(a, b),
      (e: ImageError) => e.e.message,
    );

  return function Page() {
    const id = useId();

    return (
      <StateWrap
        loader={() => imageService.loader(id)}
        loading={<Loading />}
        error={({ e }) => <ErrorComponent>{e.message}</ErrorComponent>}
      >
        <ImageViewer
          useImages={imageService.useImages}
          useUser={userService.useUser}
          productId={id}
          onAdd={onAdd}
          onDelete={onDelete}
          onSwap={onSwap}
        />
      </StateWrap>
    );
  };
});

export default page;

// ── Pure React component ─────────────────────────────────────────

function ImageViewer({
  useImages,
  useUser,
  productId,
  onAdd,
  onDelete,
  onSwap,
}: {
  useImages: () => ImageResult[];
  useUser: () => { role: string };
  productId: string;
  onAdd: (productId: string, file: File) => Promise<string | null>;
  onDelete: (productId: string, id: string) => Promise<string | null>;
  onSwap: (a: string, b: string) => Promise<string | null>;
}) {
  const images = useImages();
  const [selected, setSelected] = useSelected(images);
  const [index, handlePrev, handleNext] = useChange(images);
  const [refContainer, container] = useContainerSize();
  const [ref, control] = useControlSize();
  const role = useUser().role;

  return (
    <div ref={refContainer} className="flex flex-col gap-1 flex-1 w-full min-h-0">
      <div className="flex-1 min-h-0 justify-center items-center flex">
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
          className="relative flex-1 min-h-0 flex justify-center items-center overflow-hidden"
        >
          <img className="max-w-full max-h-full object-contain" src={selected?.href} />
          {selected && role === "admin" ? (
            <DeleteImg
              selected={selected}
              productId={productId}
              onDelete={onDelete}
            />
          ) : null}
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
              <Thumbnail image={image} selected={selected!} />
            </button>
          ))}
        </div>
        <ImageControl
          images={images}
          selected={selected}
          productId={productId}
          onAdd={onAdd}
          onSwap={onSwap}
        />
      </div>
    </div>
  );
}

function Thumbnail({
  image,
  selected,
}: {
  image: ImageResult;
  selected: ImageResult;
}) {
  return (
    <img
      className={cn("object-contain w-full h-full", {
        outline: selected.id === image.id,
      })}
      src={image.href}
    />
  );
}
