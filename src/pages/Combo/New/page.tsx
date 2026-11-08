import { useMemo } from "react";
import { useNavigate } from "~/services/route/react";
import { ReservedSkeleton } from "~/components/page-data";
import { pageData } from "../data";
import { comboSources } from "../sources";
import { ComboForm } from "../Form/ComboForm";
import { ComboFormLoading } from "../Form/z-Loading";

export default function Page() {
  const sources = useMemo(() => comboSources(), []);
  const navigate = useNavigate();

  return (
    <pageData.Provider sources={sources}>
      <main className="flex h-[calc(100vh-52px)] w-full flex-col overflow-hidden">
        <h1 className="sr-only">Combo baru</h1>
        <div className="min-h-0 flex-1 overflow-hidden">
          <CreateForm onCreated={(id) => navigate(`/combos/${id}`, { behavior: "replace" })} />
        </div>
      </main>
    </pageData.Provider>
  );
}

function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const listingsStatus = pageData.useStatus("listings");
  const extrasStatus = pageData.useStatus("extras");
  const ready = [listingsStatus, extrasStatus].every((status) => status === "ready" || status === "stale");
  const loading = (
    <ReservedSkeleton className="h-full min-h-0 flex flex-col">
      <ComboFormLoading />
    </ReservedSkeleton>
  );

  return (
    <pageData.Gate keys={["listings", "extras"]} delay={0} pulse={loading}>
      {({ listings, extras }) =>
        ready ? <ComboForm listings={listings} extras={extras} onCreated={onCreated} /> : loading
      }
    </pageData.Gate>
  );
}
