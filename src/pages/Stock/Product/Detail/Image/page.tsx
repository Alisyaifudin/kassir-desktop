import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { DeleteImg } from "./z-DeleteImg";
import { ImageControl } from "./z-ImageControl";
import { useSelected } from "./use-selected";
import { useChange } from "./use-change";
import { useContainerSize, useControlSize } from "./use-container-size";
import { ImageResult, useData } from "./use-data";
import { Result } from "~/lib/result";
import { ErrorComponent } from "~/components/ErrorComponent";
import { log } from "~/lib/log";
import { useUser } from "~/hooks/use-user";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError(error) {
      log.error(error.e);
      return <ErrorComponent>{error.e.message}</ErrorComponent>;
    },
    onSuccess(images) {
      return <Wrapper images={images} />;
    },
  });
}

function Loading() {
  return (
    <div className="flex flex-col gap-1 flex-1 w-full min-h-0">
      <div className="flex-1 min-h-0 justify-center items-center flex gap-1">
        <Skeleton className="h-full w-10" />
        <div className="relative flex-1 min-h-0 flex justify-center items-center overflow-hidden">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-full w-10" />
      </div>
      <div className="flex flex-col w-full min-h-0 gap-1">
        <div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 aspect-square" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function Wrapper({ images }: { images: ImageResult[] }) {
  const [selected, setSelected] = useSelected(images);
  const [index, handlePrev, handleNext] = useChange(images);
  const [refContainer, container] = useContainerSize();
  const [ref, control] = useControlSize();
  const role = useUser().role;
  return (
    <div ref={refContainer} className="flex flex-col gap-1 flex-1 w-full min-h-0">
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
