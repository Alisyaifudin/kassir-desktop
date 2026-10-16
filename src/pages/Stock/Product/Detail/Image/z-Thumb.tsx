import { Reorder } from "motion/react";
import { cn } from "~/lib/utils";
import { useDragGuard } from "./use-drag-guard";
import { ImageResult } from "./use-data";

export function Thumb({
  image,
  selected,
  onSelect,
}: {
  image: ImageResult;
  selected: ImageResult | null;
  onSelect: () => void;
}) {
  const { onDragStart, onDragEnd, handleClick } = useDragGuard(onSelect);
  return (
    <Reorder.Item
      value={image}
      className="relative h-32 aspect-square p-0.5"
      // slightly lifted, so the one being moved reads as picked up
      whileDrag={{ scale: 1.05 }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className="h-full w-full cursor-grab p-0 active:cursor-grabbing"
        onClick={handleClick}
      >
        <img
          className={cn("object-contain w-full h-full pointer-events-none", {
            outline: selected?.id === image.id,
          })}
          src={image.href}
          draggable={false}
        />
      </button>
    </Reorder.Item>
  );
}
