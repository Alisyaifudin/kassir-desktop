import { useSelected } from "./use-selected";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "~/components/Spinner";
import { ImageDialog } from "./z-ImageDialog";
import { ImageResult } from "./use-data";
import { useSwap } from "./use-swap";

export function ImageControl({ images }: { images: ImageResult[] }) {
  const [selected] = useSelected(images);
  const prev = getPrev(images, selected);
  const next = getNext(images, selected);
  return (
    <div className="flex gap-2 w-full justify-between">
      <SwapLeft current={selected?.id} prev={prev} />
      <ImageDialog />
      <SwapRight current={selected?.id} next={next} />
    </div>
  );
}

function getPrev(images: ImageResult[], selected: ImageResult | null) {
  if (selected === null) return undefined;
  const prevs = images.filter((img) => img.order < selected.order);
  if (prevs.length === 0) return undefined;
  let id = prevs[0].id;
  let currentOrder = prevs[0].order;
  for (const image of images) {
    if (image.order > currentOrder) {
      currentOrder = image.order;
      id = image.id;
    }
  }
  return id;
}

function getNext(images: ImageResult[], selected: ImageResult | null) {
  if (selected === null) return undefined;
  const nexts = images.filter((img) => img.order > selected.order);
  if (nexts.length === 0) return undefined;
  let id = nexts[0].id;
  let currentOrder = nexts[0].order;
  for (const image of images) {
    if (image.order < currentOrder) {
      currentOrder = image.order;
      id = image.id;
    }
  }
  return id;
}

function SwapLeft({ current, prev }: { current?: string; prev?: string }) {
  const { loading, handleSwap } = useSwap();
  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={() => {
          if (prev === undefined || current === undefined) return;
          handleSwap(current, prev);
        }}
        variant="ghost"
        className="flex text-small! items-center"
        disabled={current === undefined}
      >
        <ChevronLeft className="icon" />
        Pindahkan Kiri
      </Button>
      <Spinner when={loading} />
    </div>
  );
}

function SwapRight({ current, next }: { current?: string; next?: string }) {
  const { handleSwap } = useSwap();
  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={() => {
          if (next === undefined || current === undefined) return;
          handleSwap(current, next);
        }}
        variant="ghost"
        className="flex text-small! items-center"
        disabled={current === undefined}
      >
        Pindahkan Kanan
        <ChevronRight className="icon" />
      </Button>
    </div>
  );
}
