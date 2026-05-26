import { Form } from "./z-Form";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { useAtom } from "@xstate/store/react";
import { syncAtom } from "~/lib/sync/atom";
import { startSync, startResync } from "~/lib/sync/program";
import { Show } from "~/components/Show";
import { useState } from "react";

export function Sync({ token }: { token?: string }) {
  const state = useAtom(syncAtom);
  const [loading, setLoading] = useState(false);

  const isRunning = state.phase === "syncing";

  const handleSync = async () => {
    if (!token) return;
    setLoading(true);
    await startSync(token);
    setLoading(false);
  };

  const handleResync = async () => {
    if (!token) return;
    setLoading(true);
    await startResync(token);
    setLoading(false);
  };

  return (
    <div className="rounded-2xl gap-4 border bg-card p-4 shadow-sm flex-1 flex flex-col">
      <Form token={token} />

      <Show value={token}>
        {() => (
          <div className="flex items-center gap-2">
            <Button disabled={isRunning || loading} onClick={handleSync} className="min-w-[160px]">
              <Spinner when={isRunning || loading} />
              {isRunning ? "Menyinkronkan..." : "Sinkronisasi"}
            </Button>
            <Button
              disabled={isRunning || loading}
              onClick={handleResync}
              variant="destructive"
              className="min-w-[160px]"
            >
              Sinkronisasi Ulang
            </Button>
          </div>
        )}
      </Show>
    </div>
  );
}
