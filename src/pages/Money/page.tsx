import { useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { setMoney, useMoney } from "./use-money";
import { NavCard } from "./z-NavCard";

export default function Page() {
  const money = useMoney();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = money.findIndex((m) => m.id === active.id);
        const newIndex = money.findIndex((m) => m.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          setMoney(arrayMove(money, oldIndex, newIndex));
        }
      }
    },
    [money],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={money.map((m) => m.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {money.map((m) => (
            <NavCard key={m.id} money={m} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
