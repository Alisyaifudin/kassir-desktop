import { ReadLog, LoadingLines } from "./z-ReadLog";
import { ClearLog } from "./z-ClearLog";
import { Effect } from "effect";
import { LogService } from "~/services/log";
import { StateWrap } from "~/components/StateWrap";
import { TextError } from "~/components/TextError";
import { promisify } from "~/lib/promisify";

const page = Effect.gen(function* () {
  const logService = yield* LogService;

  const onClear = () =>
    promisify(
      () => logService.clear(),
      (e) => e.e.message,
    );

  return function Page() {
    return (
      <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold text-foreground">Log Aplikasi</h1>
          <p className="text-muted-foreground text-normal">Pantau aktivitas dan kesalahan sistem</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm flex-1 flex flex-col">
          <StateWrap
            loader={logService.loader}
            loading={<LoadingLines />}
            error={({ e }) => <TextError>{e.message}</TextError>}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-normal font-semibold text-foreground">Riwayat Log</h2>
              <ClearLog onClear={onClear} />
            </div>
            <div className="flex flex-col gap-1 bg-black rounded-xl p-4 h-full overflow-auto">
              <ReadLog useLog={logService.useLog} />
            </div>
          </StateWrap>
        </div>
      </div>
    );
  };
});

export default page;
