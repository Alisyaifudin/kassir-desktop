import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { TextError } from "~/components/TextError";
import { useMutation } from "~/components/Loader";
import Redirect from "~/components/Redirect";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { PocketSummary } from "~/services/money";
import { pageData } from "./data";
import { NavCard } from "./z-NavCard";
import { NewPocket } from "./z-NewPocket";
import { CardsLoading } from "./z-Loading";

export default function Page() {
  // `/money` replaced a route middleware that gate-kept the whole tree; the
  // alt+3 shortcut still reaches it, so the gate lives here now.
  const role = useUser().role;
  if (role !== "admin") return <Redirect to="/" />;

  return (
    <pageData.Provider sources={{ pockets: service.money.pockets.get.changes }}>
      <Grid />
    </pageData.Provider>
  );
}

/**
 * The heading and the add-pocket button are static; only the cards wait. A failed
 * read is a line where the grid would be, not a full-page takeover.
 */
function Grid() {
  const { mutate } = useMutation(service.money.pockets.set.ordering);

  return (
    <main className="flex flex-col gap-2 w-full px-0.5 mx-auto flex-1 overflow-hidden">
      <div className="py-1 pr-1">
        <h1 className="text-big font-bold">Catatan Keuangan</h1>
      </div>
      {/* The service owns the order, so a drop re-reads it back instead of
          keeping a second copy of the list in this component. */}
      <pageData.Gate
        keys={["pockets"]}
        pulse={<CardsLoading />}
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ pockets }) => (
          <Sortable summaries={pockets} onReorder={(items) => void mutate(items)} />
        )}
      </pageData.Gate>
      <NewPocket />
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

  const handleDragEnd = (event: DragEndEvent) => {
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
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={summaries.map((summary) => summary.pocket.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {summaries.map((summary) => (
            <NavCard key={summary.pocket.id} summary={summary} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
