import { useData } from "./use-data";
import { TextError } from "~/components/TextError";
import { Clear } from "./z-Clear";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Log Aplikasi</h1>
        <p className="text-muted-foreground text-normal">Pantau aktivitas dan kesalahan sistem</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-normal font-semibold text-foreground">Riwayat Log</h2>
          <Clear />
        </div>

        <div className="flex flex-col gap-1 bg-black rounded-xl p-4 h-full overflow-auto">
          <Log />
        </div>
      </div>
    </div>
  );
}

function Log() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingLines />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(text) {
      return (
        <>
          {text.map((t, i) => (
            <p className="text-white text-small" key={i}>
              {t}
            </p>
          ))}
        </>
      );
    },
  });
}

function LoadingLines() {
  return (
    <div className="flex flex-col gap-2 p-2 w-full">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 bg-white/10 rounded animate-pulse"
          style={{ width: `${60 + ((i * 7) % 40)}%` }}
        />
      ))}
    </div>
  );
}
