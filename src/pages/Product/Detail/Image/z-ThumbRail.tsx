import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { useImageUrl } from "~/hooks/use-image";
import { cn } from "~/lib/utils";
import type { ProductImage } from "~/services/product";

export function ThumbRail({
  images,
  selectedId,
  disabled,
  canManage,
  onSelect,
  onDelete,
  onReorder,
}: {
  images: ProductImage[];
  selectedId: string | null;
  disabled?: boolean;
  canManage: boolean;
  onSelect: (id: string) => void;
  onDelete: (image: ProductImage) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const oldIndex = images.findIndex((item) => item.id === active.id);
    const newIndex = images.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(images, oldIndex, newIndex).map((item) => item.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((item, index) => (
            <Thumb
              key={item.id}
              image={item}
              index={index}
              selected={item.id === selectedId}
              canManage={canManage && !disabled}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Thumb({
  image,
  index,
  selected,
  canManage,
  onSelect,
  onDelete,
}: {
  image: ProductImage;
  index: number;
  selected: boolean;
  canManage: boolean;
  onSelect: (id: string) => void;
  onDelete: (image: ProductImage) => void;
}) {
  const url = useImageUrl(image.name, image.mime);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled: !canManage,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
      className={cn("relative shrink-0", canManage && "cursor-grab active:cursor-grabbing")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={() => onSelect(image.id)}
        className={cn(
          "block size-20 overflow-hidden rounded-lg border-2 bg-muted/40 small:size-16",
          selected ? "border-primary" : "border-transparent",
        )}
      >
        {url !== null ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      </button>
      {index === 0 ? (
        <span className="absolute left-1 top-1 rounded bg-primary px-1 text-small text-primary-foreground">
          Cover
        </span>
      ) : null}
      {canManage ? (
        <button
          type="button"
          className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-primary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image);
          }}
          aria-label="Hapus gambar"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
