import { Item, Method } from "./z-Item";
import { NewBtn } from "./z-NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./z-TabLink";
import { logOld } from "~/lib/utils";
import { Suspense } from "react";
import { TextError } from "~/components/TextError";
import { Loading, LoadingFull } from "~/components/Loading";
import { useData } from "./use-data";
import { Result } from "~/lib/result";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 p-5 flex-1 overflow-auto">
      <h1 className="text-big font-bold">Metode Pembayaran</h1>
      <TabLink />
      <Suspense fallback={<Loading />}>
        <Wrapper />
      </Suspense>
      <NewBtn />
    </div>
  );
}

function Wrapper() {
  const res = useData();
  const [method] = useMethod();
  return Result.match(res, {
    onLoading() {
      return <LoadingFull />;
    },
    onError({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onSuccess([data, defaultMethod]) {
      const methods = data.filter((d) => d.kind === method && d.name !== undefined) as Method[];
      return (
        <div className="flex flex-col gap-2 overflow-auto">
          {methods.map((m) => {
            const kind = m.kind;
            const defVal = defaultMethod[kind];
            return <Item key={m.id} method={m} defVal={defVal} />;
          })}
        </div>
      );
    },
  });
}
