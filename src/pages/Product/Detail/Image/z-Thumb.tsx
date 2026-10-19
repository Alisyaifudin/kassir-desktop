import { Reorder } from "motion/react";
import { cn } from "~/lib/utils";
import { useImageUrl } from "~/hooks/use-image";
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
  // A saved row resolves its file by name; a draft already has an object url.
  const saved = useImageUrl(
    item.draft === null ? item.file : null,
    item.draft === null ? item.mime : null,
  );
  const href = item.draft !== null ? item.draft.href : saved;

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
        {href !== null ? (
          <img
            className={cn("pointer-events-none h-full w-full object-contain", { outline: selected })}
            src={href}
            draggable={false}
            alt=""
          />
        ) : null}
      </button>
    </Reorder.Item>
  );
}
