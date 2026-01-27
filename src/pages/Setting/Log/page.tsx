import { log } from "~/lib/utils";
import { loader } from "./loader";
import { Suspense } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { Either } from "effect";
import { Clear } from "./z-Clear";
import { useMicro } from "~/hooks/use-micro";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 text-3xl overflow-hidden">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Log</h1>
        <Clear />
      </div>
      <div className="flex flex-col gap-1 bg-black h-full overflow-auto">
        <Suspense fallback={<Loading />}>
          <Log />
        </Suspense>
      </div>
    </div>
  );
}


function Log() {
  const either = useMicro({
    fn: () => loader(),
    key: "log",
  });
  return Either.match(either, {
    onLeft(left) {
      const errMsg = left.e.message;
      log.error(JSON.stringify(left.e.stack));
      return <TextError>{errMsg}</TextError>;
    },
    onRight(text) {
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
