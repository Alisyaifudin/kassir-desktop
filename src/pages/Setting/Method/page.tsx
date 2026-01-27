import { Item } from "./z-Item";
import { NewBtn } from "./z-NewBtn";
import { useMethod } from "./use-method";
import { TabLink } from "./z-TabLink";
import { log } from "~/lib/utils";
import { Suspense } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { Method } from "~/database-effect/method/get-all";
import { useMicro } from "~/hooks/use-micro";
import { KEY, loader } from "./loader";
import { Either } from "effect";

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
  const res = useMicro({
    fn: () => loader(),
    key: KEY,
  });
  const [method] = useMethod();
  return Either.match(res, {
    onLeft({ e }) {
      log.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight([data, defaultMethod]) {
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
