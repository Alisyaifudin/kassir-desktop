import { useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { Loader, useMutation, useStream } from "~/components/Loader";
import Redirect from "~/components/Redirect";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { PocketSummary } from "~/services/money";
import { NavCard } from "./z-NavCard";
import { NewPocket } from "./z-NewPocket";
import { MoneyErrorBoundary, MoneyErrorFallback } from "./z-Error";
import { CardsLoading } from "./z-Loading";

export default function Page() {
  // `/money` replaced a route middleware that gate-kept the whole tree; the
  // alt+3 shortcut still reaches it, so the gate lives here now.
  const role = useUser().role;
  if (role !== "admin") return <Redirect to="/" />;

  return (
    <MoneyErrorBoundary fallback={MoneyErrorFallback}>
      <Grid />
    </MoneyErrorBoundary>
  );
}

function Grid() {
  const res = useStream(service.money.pockets.get.changes);
  const { mutate } = useMutation(service.money.pockets.set.ordering);

  return (
    <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
      <div className="flex items-center justify-between py-1 pr-1">
        <h1 className="text-big font-bold">Catatan Keuangan</h1>
        <NewPocket />
      </div>
      {/* The service owns the order, so a drop re-reads it back instead of
          keeping a second copy of the list in this component. */}
      <Loader res={res} fallback={<CardsLoading />}>
        {({ data: summaries }) => (
          <Sortable
            summaries={summaries}
            onReorder={(items) => void mutate(items)}
          />
        )}
      </Loader>
    </main>
  );
}

function Sortable({
  summaries,
  onReorder,
}: {
  summaries: PocketSummary[];
  onReorder: (items: { id: string; order: number }[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over === null || active.id === over.id) return;
      const oldIndex = summaries.findIndex((summary) => summary.pocket.id === active.id);
      const newIndex = summaries.findIndex((summary) => summary.pocket.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onReorder(
        arrayMove(summaries, oldIndex, newIndex).map((summary, order) => ({
          id: summary.pocket.id,
          order,
        })),
      );
    },
    [summaries, onReorder],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={summaries.map((summary) => summary.pocket.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {summaries.map((summary) => (
            <NavCard key={summary.pocket.id} summary={summary} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
