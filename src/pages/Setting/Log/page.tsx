import { readLogEffect, LoadingLines } from "./effect-readLog";
import { clearLogEffect } from "./effect-clearLog";
import { Effect } from "effect";
import { LogService } from "~/services/log";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";

const page = Effect.gen(function* () {
  const logService = yield* LogService;
  const useLoad = logService.useLoad;
  const ReadLog = yield* readLogEffect;
  const ClearLog = yield* clearLogEffect;
  return function Page() {
    const status = useLoad();
    return (
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Log Aplikasi</h1>
          <p className="text-muted-foreground text-normal">Pantau aktivitas dan kesalahan sistem</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm flex-1 flex flex-col">
          <StateWrap
            status={status}
            loading={<LoadingLines />}
            error={({ e }) => <TextError>{e.message}</TextError>}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-normal font-semibold text-foreground">Riwayat Log</h2>
              <ClearLog />
            </div>
            <div className="flex flex-col gap-1 bg-black rounded-xl p-4 h-full overflow-auto">
              <ReadLog />
            </div>
          </StateWrap>
        </div>
      </div>
    );
  };
});

export default page;
