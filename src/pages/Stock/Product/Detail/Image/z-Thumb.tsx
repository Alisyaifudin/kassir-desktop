import { Reorder } from "motion/react";
import { cn } from "~/lib/utils";
import { useDragGuard } from "./use-drag-guard";
import { GalleryItem } from "./use-gallery";

export function Thumb({
  item,
  selected,
  onSelect,
}: {
  item: GalleryItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { onDragStart, onDragEnd, handleClick } = useDragGuard(onSelect);
  return (
    <Reorder.Item
      value={item}
      className={cn(
        "relative h-32 aspect-square shrink-0 rounded-md p-0.5",
        // a draft is not in the db yet, so it is marked as pending
        { "border border-destructive/40 bg-destructive/10": item.draft !== null },
      )}
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
          className={cn("object-contain w-full h-full pointer-events-none", { outline: selected })}
          src={item.href}
          draggable={false}
        />
      </button>
    </Reorder.Item>
  );
}
