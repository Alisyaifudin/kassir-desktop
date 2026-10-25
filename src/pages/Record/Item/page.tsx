import { useMemo } from "react";
import { useDelayedFlag } from "~/components/Loader";
import { pageData, recordSource } from "./data";
import { service } from "~/services";
import { Views } from "./z-Views";

/**
 * `/records/:recordId` — one record, in full.
 *
 * `Detail | Resi` is a URL value, not data, so the strip is drawn before the
 * record arrives; each tab gates its own body with the same `record` key, and the
 * receipt adds the shop identity and contacts it prints.
 */
export default function Page({ recordId }: { recordId: string }) {
  const sources = useMemo(
    () => ({
      record: recordSource(recordId),
      info: service.info.changes,
      socials: service.social.get.changes,
    }),
    [recordId],
  );

  return (
    <pageData.Provider sources={sources} deps={[recordId]}>
      <Screen />
    </pageData.Provider>
  );
}

function Screen() {
  // An edit makes the record re-read itself. Fading both faces meanwhile keeps
  // the version just replaced from being worked on; a first load is the gate's
  // job, so this is never true then.
  const busy = useDelayedFlag(pageData.useStatus("record") === "refreshing");

  return (
    <main className="flex flex-col gap-2 p-2 h-full overflow-hidden">
      <Views busy={busy} />
    </main>
  );
}
