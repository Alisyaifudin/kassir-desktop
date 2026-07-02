import { Effect } from "effect";
import { NavCard } from "./z-NavCard";
import { MoneyService } from "~/services/money";
import { useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { PocketFull } from "~/services/money/type";

export const navList = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const usePockets = () => moneyService.pocket.usePockets();
  const setOrder = (pockets: PocketFull[]) =>
    moneyService.pocket.set.ordering(pockets.map((p) => p.id));
  return function NavList() {
    const pockets = usePockets();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
          const oldIndex = pockets.findIndex((m) => m.id === active.id);
          const newIndex = pockets.findIndex((m) => m.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            setOrder(arrayMove(pockets, oldIndex, newIndex));
          }
        }
      },
      [pockets],
    );
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pockets.map((m) => m.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {pockets.map((p) => (
              <NavCard key={p.id} pocket={p} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };
});
