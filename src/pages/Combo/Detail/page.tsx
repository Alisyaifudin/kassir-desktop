import { useMemo } from "react";
import { Link, useBack, useParams } from "~/services/route/react";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { ReservedSkeleton } from "~/components/page-data";
import { pageData } from "../data";
import { comboSources } from "../sources";
import { ComboForm } from "../Form/ComboForm";
import { ComboFormLoading } from "../Form/z-Loading";

export default function Page() {
  const sources = useMemo(() => comboSources(), []);
  const { id } = useParams();
  const back = useBack("/combos");

  if (id === undefined) return null;

  return (
    <pageData.Provider sources={sources}>
      <main className="flex h-[calc(100vh-52px)] w-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <EditForm id={id} onDeleted={back} />
        </div>
      </main>
    </pageData.Provider>
  );
}

function EditForm({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const combosStatus = pageData.useStatus("combos");
  const listingsStatus = pageData.useStatus("listings");
  const extrasStatus = pageData.useStatus("extras");
  const ready = [combosStatus, listingsStatus, extrasStatus].every(
    (status) => status === "ready" || status === "stale",
  );
  const loading = <ReservedSkeleton className="h-full min-h-0 flex flex-col"><ComboFormLoading /></ReservedSkeleton>;

  return (
    <pageData.Gate keys={["combos", "listings", "extras"]} delay={0} pulse={loading}>
      {({ combos, listings, extras }) => {
        if (!ready) return loading;
        const combo = combos.find((item) => item.id === id);
        if (combo === undefined) {
          return (
            <div className="flex flex-col items-start gap-3 p-4">
              <TextError>Combo tidak ditemukan.</TextError>
              <Button asChild variant="outline">
                <Link to="/combos" behavior="replace">Kembali ke combo</Link>
              </Button>
            </div>
          );
        }
        return (
          <ComboForm
            key={combo.id}
            combo={combo}
            listings={listings}
            extras={extras}
            onCreated={() => undefined}
            onDeleted={onDeleted}
          />
        );
      }}
    </pageData.Gate>
  );
}
