import { useData } from "./use-data";
import { TextError } from "~/components/TextError";
import { Clear } from "./z-Clear";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 text-3xl overflow-hidden">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Log</h1>
        <Clear />
      </div>
      <div className="flex flex-col gap-1 bg-black h-full overflow-auto">
        <Log />
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
    <div className="flex flex-col gap-1 p-2 w-full">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 bg-white/10"
          style={{ width: `${60 + ((i * 7) % 40)}%` }}
        />
      ))}
    </div>
  );
}
