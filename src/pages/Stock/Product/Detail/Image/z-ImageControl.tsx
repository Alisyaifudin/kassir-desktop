import { useSelected } from "./use-selected";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "~/components/Spinner";
import { ImageDialog } from "./z-ImageDialog";
import { ImageResult } from "./use-data";
import { useSwap } from "./use-swap";

export function ImageControl({ images }: { images: ImageResult[] }) {
  const [selected] = useSelected(images);
  const index = images.findIndex((im) => im.id === selected?.id);
  return (
    <div className="flex gap-2 w-full justify-between">
      <SwapLeft current={selected?.id} prev={index <= 0 ? undefined : images[index - 1].id} />
      <ImageDialog />
      <SwapRight
        current={selected?.id}
        next={index >= images.length - 1 ? undefined : images[index + 1].id}
      />
    </div>
  );
}

function SwapLeft({ current, prev }: { current?: number; prev?: number }) {
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

function SwapRight({ current, next }: { current?: number; next?: number }) {
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
