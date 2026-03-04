import { useData } from "./use-data";
import { TextError } from "~/components/TextError";
import { LoadingFull } from "~/components/Loading";
import { Clear } from "./z-Clear";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";

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
      return <LoadingFull />;
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
