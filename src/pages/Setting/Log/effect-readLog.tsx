import { Effect } from "effect";
import { LogService } from "~/services/log";
import { Skeleton } from "~/components/ui/skeleton";

export const readLogEffect = Effect.gen(function* () {
  const logService = yield* LogService;
  const useLogLines = logService.log.useData;
  return function ReadLog() {
    const { data: lines } = useLogLines();
    return (
      <>
        {lines.map((t, i) => (
          <p className="text-white text-small" key={i}>
            {t}
          </p>
        ))}
      </>
    );
  };
});

export function LoadingLines() {
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
