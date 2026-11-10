import { useState } from "react";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";
import { AutoPanel } from "./z-AutoPanel";
import { CursorLine, ServerForm } from "./z-ServerForm";
import { RunPanel } from "./z-RunPanel";

const item = navItemOf("/setting/sync");

/**
 * Sinkronisasi: the device's mirror of the cloud, in three panels.
 *
 * "Server" is configuration, "Sinkronisasi" is the action and "Sinkronisasi
 * Otomatis" is the standing policy, in the order an operator needs them: a fresh
 * install must be pointed at the server (and given a token) before a run means
 * anything, a run proves the two halves work, and only then is trusting a
 * schedule worth considering. All are admin-only (the route enforces it).
 */
export default function Page() {
  // The run button stays disabled until a server *and* a token are stored: a sync
  // with no credentials can only fail, and the error would be about the thing the
  // operator was already meant to fill in.
  const [configured, setConfigured] = useState(false);

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6">
      <PageHeader title={item.label} description={item.description} />
      <Panel title="1. Server">
        <ServerForm onConfigured={setConfigured} />
        <CursorLine />
      </Panel>
      <Panel title="2. Sinkronisasi">
        <RunPanel configured={configured} />
      </Panel>
      <Panel title="3. Sinkronisasi Otomatis">
        <AutoPanel configured={configured} />
      </Panel>
    </div>
  );
}
